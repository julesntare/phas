import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';
import { dispatchNotifications } from '@/lib/notifier';
import { dispatchWebhook } from '@/lib/webhook';
import { sendIncidentAlert } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const incidents = await sql<{
    id: string; state: string; opened_at: Date; closed_at: Date | null;
    confidence: number; recurrence_count: number;
    platform_name: string; cosign_count: string; comment_count: string;
  }[]>`
    SELECT
      i.id, i.state, i.opened_at, i.closed_at, i.confidence, i.recurrence_count,
      p.name AS platform_name,
      COUNT(DISTINCT r.id) FILTER (WHERE r.incident_id = i.id) AS cosign_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM incidents i
    JOIN platforms p ON p.id = i.platform_id
    LEFT JOIN reports r ON r.incident_id = i.id
    LEFT JOIN incident_comments c ON c.incident_id = i.id
    WHERE i.platform_id = ${op.platformId}
      AND i.state <> 'resolved'
    GROUP BY i.id, p.name
    ORDER BY i.opened_at DESC
  `;

  return NextResponse.json(incidents);
}

// POST /api/operator/incidents — manually open an incident (for operator-known outages).
export async function POST(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const note: string = (body?.note ?? '').trim();

  // Block if there's already an open incident.
  const [existing] = await sql<{ id: string; state: string }[]>`
    SELECT id, state FROM incidents
    WHERE platform_id = ${op.platformId} AND state <> 'resolved'
    ORDER BY opened_at DESC LIMIT 1
  `;
  if (existing) {
    return NextResponse.json(
      { error: `An incident is already open (state: ${existing.state})`, incidentId: existing.id },
      { status: 409 },
    );
  }

  const [platform] = await sql<{ name: string; contact_email: string | null }[]>`
    SELECT name, contact_email FROM platforms WHERE id = ${op.platformId}
  `;

  // Check for a recent resolved incident to mark as recurred.
  const recurWindowDays = Number(process.env.FUSION_RECUR_WINDOW_DAYS ?? 7);
  const [recent] = await sql<{ id: string; recurrence_count: number }[]>`
    SELECT id, recurrence_count FROM incidents
    WHERE platform_id = ${op.platformId}
      AND state = 'resolved'
      AND closed_at > NOW() - ${`${recurWindowDays} days`}::interval
    ORDER BY closed_at DESC LIMIT 1
  `;

  let incidentId: string;

  if (recent) {
    await sql`
      UPDATE incidents
      SET state = 'recurred', closed_at = NULL, updated_at = NOW(),
          recurrence_count = ${recent.recurrence_count + 1}
      WHERE id = ${recent.id}
    `;
    await sql`
      INSERT INTO incident_events (incident_id, from_state, to_state, source, note)
      VALUES (${recent.id}, 'resolved', 'recurred', 'helpdesk', ${note || null})
    `;
    incidentId = recent.id;
    dispatchWebhook(op.platformId, incidentId, 'resolved', 'recurred', note || null).catch(console.error);
  } else {
    const [incident] = await sql<{ id: string }[]>`
      INSERT INTO incidents (platform_id, state, confidence)
      VALUES (${op.platformId}, 'detected', 1)
      RETURNING id
    `;
    await sql`
      INSERT INTO incident_events (incident_id, from_state, to_state, source, note)
      VALUES (${incident.id}, NULL, 'detected', 'helpdesk', ${note || null})
    `;
    incidentId = incident.id;
    await dispatchNotifications(op.platformId, incidentId);
    dispatchWebhook(op.platformId, incidentId, null as unknown as string, 'detected', note || null).catch(console.error);
  }

  // Email the platform contact.
  if (platform?.contact_email) {
    sendIncidentAlert({
      to: [platform.contact_email],
      platformName: platform.name,
      authorityName: '',
      incidentId,
      state: recent ? 'recurred' : 'detected',
    }).catch(console.error);
  }

  return NextResponse.json({ incidentId, recurred: !!recent }, { status: 201 });
}
