import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';
import { dispatchOperatorUpdate, dispatchResolutionFeedback } from '@/lib/notifier';
import { dispatchWebhook } from '@/lib/webhook';

const VALID_TRANSITIONS: Record<string, string[]> = {
  acknowledge:       ['detected', 'confirmed', 'recurred'],
  partially_resolve: ['acknowledged'],
  resolve:           ['detected', 'confirmed', 'acknowledged', 'partially_resolved', 'recurred'],
};

const ACTION_TO_STATE: Record<string, string> = {
  acknowledge:       'acknowledged',
  partially_resolve: 'partially_resolved',
  resolve:           'resolved',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [incident] = await sql<{
    id: string; state: string; opened_at: Date; closed_at: Date | null;
    confidence: number; recurrence_count: number; platform_id: string;
    platform_name: string; authority_name: string;
  }[]>`
    SELECT i.id, i.state, i.opened_at, i.closed_at, i.confidence, i.recurrence_count,
           i.platform_id, p.name AS platform_name, a.name AS authority_name
    FROM incidents i
    JOIN platforms p ON p.id = i.platform_id
    JOIN authorities a ON a.id = p.authority_id
    WHERE i.id = ${id}
  `;

  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (incident.platform_id !== op.platformId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [events, comments, reports, [{ cosign_count }]] = await Promise.all([
    sql<{ from_state: string | null; to_state: string; source: string; note: string | null; at: Date }[]>`
      SELECT from_state, to_state, source, note, at
      FROM incident_events
      WHERE incident_id = ${id}
      ORDER BY at DESC LIMIT 30
    `,
    sql<{ id: string; content: string; district: string | null; created_at: Date }[]>`
      SELECT id, content, district, created_at
      FROM incident_comments
      WHERE incident_id = ${id}
      ORDER BY created_at ASC LIMIT 100
    `,
    sql<{ id: string; free_text: string | null; proof_image_url: string | null; district: string | null; created_at: Date }[]>`
      SELECT id, free_text, proof_image_url, district, created_at
      FROM reports
      WHERE incident_id = ${id}
        AND (free_text IS NOT NULL OR proof_image_url IS NOT NULL)
      ORDER BY created_at ASC LIMIT 50
    `,
    sql<{ cosign_count: string }[]>`
      SELECT COUNT(*) AS cosign_count FROM reports
      WHERE incident_id = ${id}
    `,
  ]);

  return NextResponse.json({ ...incident, events, comments, reports, cosignCount: Number(cosign_count) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  // action: 'acknowledge' | 'partially_resolve' | 'resolve' | 'update'
  // note: optional string (required for 'update', optional otherwise)
  const action: string = body?.action ?? '';
  const note: string = (body?.note ?? '').trim();

  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });
  if (action === 'update' && !note) {
    return NextResponse.json({ error: 'note required for update' }, { status: 400 });
  }

  const [incident] = await sql<{ id: string; state: string; platform_id: string }[]>`
    SELECT id, state, platform_id FROM incidents WHERE id = ${id}
  `;

  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (incident.platform_id !== op.platformId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [platform] = await sql<{ name: string }[]>`SELECT name FROM platforms WHERE id = ${incident.platform_id}`;
  const platformName = platform?.name ?? 'Platform';

  if (action === 'update') {
    await sql`
      INSERT INTO incident_events (incident_id, from_state, to_state, source, note)
      VALUES (${id}, ${incident.state}, ${incident.state}, 'helpdesk', ${note})
    `;
    dispatchWebhook(incident.platform_id, id, incident.state, incident.state, note).catch(console.error);
    dispatchOperatorUpdate(
      incident.platform_id, id,
      `📢 ${platformName} — Operator update`,
      note,
    ).catch(console.error);
    return NextResponse.json({ ok: true });
  }

  const allowed = VALID_TRANSITIONS[action];
  if (!allowed) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  if (!allowed.includes(incident.state)) {
    return NextResponse.json(
      { error: `Cannot ${action} an incident in state '${incident.state}'` },
      { status: 409 },
    );
  }

  const newState = ACTION_TO_STATE[action];
  await sql`
    UPDATE incidents
    SET state = ${newState}, updated_at = NOW()
      ${newState === 'resolved' ? sql`, closed_at = NOW()` : sql``}
    WHERE id = ${id}
  `;
  await sql`
    INSERT INTO incident_events (incident_id, from_state, to_state, source, note)
    VALUES (${id}, ${incident.state}, ${newState}, 'helpdesk', ${note || null})
  `;

  const notifCopy: Record<string, { title: string; body: string }> = {
    acknowledge:       { title: `🔧 ${platformName} — Being investigated`, body: 'The operator is looking into the issue.' },
    partially_resolve: { title: `🔄 ${platformName} — Partially resolved`, body: 'Some services restored. Still monitoring.' },
    resolve:           { title: `✅ ${platformName} — Issue resolved`, body: 'The platform is back to normal.' },
  };
  const copy = notifCopy[action];
  if (copy) {
    dispatchOperatorUpdate(incident.platform_id, id, copy.title, copy.body).catch(console.error);
  }
  dispatchWebhook(incident.platform_id, id, incident.state, newState, note || null).catch(console.error);
  if (newState === 'resolved') {
    dispatchResolutionFeedback(incident.platform_id, id).catch(console.error);
  }

  return NextResponse.json({ ok: true, newState });
}
