import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

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

  // Optional caller identity: Google citizens are stored as reporter_id, phone users as user_id.
  let citizenId: string | null = null;
  let userId: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verifyAnyToken(authHeader.slice(7));
      if (isCitizenToken(payload)) citizenId = payload.sub;
      else userId = payload.sub;
    } catch { /* unauthenticated — treat as an anonymous viewer */ }
  }

  const [[stats], reports] = await Promise.all([
    // People affected = distinct reporters (someone who reports twice counts once),
    // excluding reports flagged off-topic/abusive by AI triage.
    sql<{ count: string; mine: boolean }[]>`
      SELECT
        COUNT(DISTINCT COALESCE(reporter_id, user_id, id))
          FILTER (WHERE relevance IS NULL OR relevance = 'on_topic') AS count,
        COALESCE(BOOL_OR(
          (${citizenId}::uuid IS NOT NULL AND reporter_id = ${citizenId}::uuid)
          OR (${userId}::uuid IS NOT NULL AND user_id = ${userId}::uuid)
        ), false) AS mine
      FROM reports
      WHERE incident_id = ${id}
    `,
    sql<{
      id: string;
      created_at: string;
      district: string | null;
      free_text: string | null;
      is_anonymous: boolean;
      reporter_name: string | null;
      is_mine: boolean;
    }[]>`
      SELECT r.id, r.created_at, r.district, r.free_text, r.is_anonymous,
             CASE WHEN r.is_anonymous THEN NULL ELSE ca.name END AS reporter_name,
             ((${citizenId}::uuid IS NOT NULL AND r.reporter_id = ${citizenId}::uuid)
               OR (${userId}::uuid IS NOT NULL AND r.user_id = ${userId}::uuid)) AS is_mine
      FROM reports r
      LEFT JOIN citizen_accounts ca ON ca.id = r.reporter_id
      WHERE r.incident_id = ${id}
        AND (r.relevance IS NULL OR r.relevance = 'on_topic')
      ORDER BY r.created_at DESC
      LIMIT 50
    `,
  ]);
  const cosignCount = stats.count;
  const userHasCosigned = stats.mine;

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
    reports,
  });
}
