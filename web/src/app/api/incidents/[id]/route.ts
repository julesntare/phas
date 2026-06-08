import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [incident] = await sql<{
    id: string;
    platform_id: string;
    platform_name: string;
    authority_name: string;
    state: string;
    opened_at: string;
    updated_at: string;
    recurrence_count: number;
    confidence: string | null;
  }[]>`
    SELECT
      i.id, i.platform_id, i.state, i.opened_at, i.updated_at,
      i.recurrence_count, i.confidence,
      p.name AS platform_name,
      a.name AS authority_name
    FROM incidents i
    JOIN platforms p ON p.id = i.platform_id
    JOIN authorities a ON a.id = p.authority_id
    WHERE i.id = ${id}
  `;

  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  // Cosign count = affected reports linked to this incident.
  const [{ count: cosignCount }] = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count FROM reports
    WHERE incident_id = ${id}
  `;

  // Opt-in: check if calling user has already cosigned (ignore auth errors).
  let userHasCosigned = false;
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    try {
      const user = await verifyToken(authHeader.replace('Bearer ', ''));
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM reports
        WHERE incident_id = ${id} AND user_id = ${user.sub}
        LIMIT 1
      `;
      userHasCosigned = !!existing;
    } catch { /* unauthenticated — treat as not cosigned */ }
  }

  // Last 20 timeline events.
  const events = await sql<{
    from_state: string | null;
    to_state: string;
    source: string;
    note: string | null;
    at: string;
  }[]>`
    SELECT from_state, to_state, source, note, at
    FROM incident_events
    WHERE incident_id = ${id}
    ORDER BY at ASC
    LIMIT 20
  `;

  return NextResponse.json({
    incident,
    cosignCount: Number(cosignCount),
    userHasCosigned,
    events,
  });
}
