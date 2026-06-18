import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Returns all platforms with their current incident state and 7-day uptime.
export async function GET() {
  const platforms = await sql<{
    id: string;
    name: string;
    category: string;
    authority_name: string;
    operator_avatar_url: string | null;
    incident_id: string | null;
    state: string | null;
    opened_at: string | null;
    uptime_7d: number | null;
  }[]>`
    SELECT
      p.id,
      p.name,
      p.category,
      a.name AS authority_name,
      p.avatar_url AS operator_avatar_url,
      i.incident_id,
      i.state,
      i.opened_at,
      u.uptime_7d
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN LATERAL (
      SELECT id AS incident_id, state, opened_at
      FROM incidents
      WHERE platform_id = p.id AND state <> 'resolved'
      ORDER BY opened_at DESC
      LIMIT 1
    ) i ON TRUE
    LEFT JOIN LATERAL (
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE ok = TRUE) / NULLIF(COUNT(*), 0),
        1
      ) AS uptime_7d
      FROM probe_results
      WHERE platform_id = p.id
        AND ran_at > NOW() - INTERVAL '7 days'
    ) u ON TRUE
    ORDER BY p.name
  `;

  return NextResponse.json({ platforms });
}
