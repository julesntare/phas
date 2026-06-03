import sql from './db';
import { dispatchNotifications } from './notifier';

const T = {
  openProbeFailures:   Number(process.env.FUSION_OPEN_PROBE_FAILURES   ?? 2),
  openAffectedRatio:   Number(process.env.FUSION_OPEN_AFFECTED_RATIO   ?? 0.30),
  openMinReporters:    Number(process.env.FUSION_OPEN_MIN_REPORTERS    ?? 5),
  openWindowHours:     Number(process.env.FUSION_OPEN_WINDOW_HOURS     ?? 2),
  closeProbePass:      Number(process.env.FUSION_CLOSE_PROBE_PASSES    ?? 3),
  closeRatioThreshold: Number(process.env.FUSION_CLOSE_RATIO_THRESHOLD ?? 0.10),
  recurWindowDays:     Number(process.env.FUSION_RECUR_WINDOW_DAYS     ?? 7),
};

type IncidentState =
  | 'detected' | 'confirmed' | 'acknowledged'
  | 'partially_resolved' | 'resolved' | 'recurred';

interface Incident {
  id: string;
  state: IncidentState;
  opened_at: Date;
  recurrence_count: number;
}

export async function runFusionForPlatform(platformId: string): Promise<void> {
  const [probeSig, crowdSig] = await Promise.all([
    getProbeSignal(platformId),
    getCrowdSignal(platformId),
  ]);

  const openIncident = await getOpenIncident(platformId);

  if (!openIncident) {
    await maybeOpenIncident(platformId, probeSig, crowdSig);
  } else {
    await maybeAdvanceOrClose(platformId, openIncident, probeSig, crowdSig);
  }
}

interface ProbeSignal { consecutiveFailures: number; consecutivePasses: number; }
interface CrowdSignal  { affected: number; ok: number; ratio: number; }

async function getProbeSignal(platformId: string): Promise<ProbeSignal> {
  const n = Math.max(T.openProbeFailures, T.closeProbePass) + 1;
  const results = await sql<{ ok: boolean }[]>`
    SELECT ok FROM probe_results
    WHERE platform_id = ${platformId}
    ORDER BY ran_at DESC LIMIT ${n}
  `;
  let consecutiveFailures = 0;
  let consecutivePasses = 0;
  for (const r of results) {
    if (!r.ok) {
      if (consecutivePasses === 0) consecutiveFailures++;
      else break;
    } else {
      if (consecutiveFailures === 0) consecutivePasses++;
      else break;
    }
  }
  return { consecutiveFailures, consecutivePasses };
}

async function getCrowdSignal(platformId: string): Promise<CrowdSignal> {
  const [{ affected, ok }] = await sql<[{ affected: string; ok: string }]>`
    SELECT
      COUNT(*) FILTER (WHERE type = 'affected') AS affected,
      COUNT(*) FILTER (WHERE type = 'ok')       AS ok
    FROM reports
    WHERE platform_id = ${platformId}
      AND created_at  > NOW() - ${`${T.openWindowHours} hours`}::interval
  `;
  const aff = Number(affected);
  const total = aff + Number(ok);
  return { affected: aff, ok: Number(ok), ratio: total > 0 ? aff / total : 0 };
}

async function getOpenIncident(platformId: string): Promise<Incident | null> {
  const [row] = await sql<Incident[]>`
    SELECT id, state, opened_at, recurrence_count
    FROM incidents
    WHERE platform_id = ${platformId} AND state <> 'resolved'
    ORDER BY opened_at DESC LIMIT 1
  `;
  return row ?? null;
}

async function maybeOpenIncident(
  platformId: string,
  probe: ProbeSignal,
  crowd: CrowdSignal,
): Promise<void> {
  const probeTriggered = probe.consecutiveFailures >= T.openProbeFailures;
  const crowdTriggered = crowd.ratio >= T.openAffectedRatio && crowd.affected >= T.openMinReporters;
  if (!probeTriggered && !crowdTriggered) return;

  const [recent] = await sql<{ id: string; closed_at: Date; recurrence_count: number }[]>`
    SELECT id, closed_at, recurrence_count FROM incidents
    WHERE platform_id = ${platformId}
      AND state = 'resolved'
      AND closed_at > NOW() - ${`${T.recurWindowDays} days`}::interval
    ORDER BY closed_at DESC LIMIT 1
  `;

  const confidence = computeConfidence(probe, crowd);
  const source = probeTriggered ? 'probe' : 'crowd';

  if (recent) {
    await sql`
      UPDATE incidents
      SET state = 'recurred', closed_at = NULL, updated_at = NOW(),
          recurrence_count = ${recent.recurrence_count + 1}, confidence = ${confidence}
      WHERE id = ${recent.id}
    `;
    await appendEvent(recent.id, 'resolved', 'recurred', source);
  } else {
    const [incident] = await sql<{ id: string }[]>`
      INSERT INTO incidents (platform_id, state, confidence)
      VALUES (${platformId}, 'detected', ${confidence}) RETURNING id
    `;
    await appendEvent(incident.id, null, 'detected', source);
    await dispatchNotifications(platformId, incident.id);
  }
}

async function maybeAdvanceOrClose(
  platformId: string,
  incident: Incident,
  probe: ProbeSignal,
  crowd: CrowdSignal,
): Promise<void> {
  if (probe.consecutivePasses >= T.closeProbePass && crowd.ratio < T.closeRatioThreshold) {
    await sql`
      UPDATE incidents SET state = 'resolved', closed_at = NOW(), updated_at = NOW()
      WHERE id = ${incident.id}
    `;
    await appendEvent(incident.id, incident.state, 'resolved', 'probe');
    return;
  }

  if (
    incident.state === 'detected' &&
    probe.consecutiveFailures >= T.openProbeFailures &&
    crowd.ratio >= T.openAffectedRatio
  ) {
    await sql`
      UPDATE incidents SET state = 'confirmed', updated_at = NOW(),
             confidence = ${computeConfidence(probe, crowd)}
      WHERE id = ${incident.id}
    `;
    await appendEvent(incident.id, 'detected', 'confirmed', 'probe');
  }
}

async function appendEvent(
  incidentId: string,
  fromState: string | null,
  toState: string,
  source: 'crowd' | 'probe' | 'helpdesk',
): Promise<void> {
  await sql`
    INSERT INTO incident_events (incident_id, from_state, to_state, source)
    VALUES (${incidentId}, ${fromState}, ${toState}, ${source})
  `;
}

function computeConfidence(probe: ProbeSignal, crowd: CrowdSignal): number {
  const probeScore = probe.consecutiveFailures >= T.openProbeFailures ? 1 : 0;
  return Math.min(1, Math.max(0, Math.round((probeScore * 0.6 + crowd.ratio * 0.4) * 1000) / 1000));
}
