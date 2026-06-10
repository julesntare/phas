import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireRegulatorAuth } from '@/lib/regulator-auth';

export async function GET(req: NextRequest) {
  try {
    await requireRegulatorAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [summary, byAuthority, activeIncidents, recentResolved, slaBreaches] = await Promise.all([
    // Overall summary
    sql<{ total_platforms: string; platforms_with_issues: string; active_incidents: string; resolved_this_week: string }[]>`
      SELECT
        COUNT(DISTINCT p.id)                                                        AS total_platforms,
        COUNT(DISTINCT p.id) FILTER (WHERE i.id IS NOT NULL)                        AS platforms_with_issues,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state <> 'resolved')                   AS active_incidents,
        COUNT(DISTINCT i.id) FILTER (
          WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '7 days'
        )                                                                            AS resolved_this_week
      FROM platforms p
      LEFT JOIN incidents i ON i.platform_id = p.id
    `,

    // Incidents grouped by authority
    sql<{ authority_id: string; authority_name: string; total_platforms: string; active_incidents: string; avg_resolve_hours: string | null }[]>`
      SELECT
        a.id                                                              AS authority_id,
        a.name                                                            AS authority_name,
        COUNT(DISTINCT p.id)                                              AS total_platforms,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state <> 'resolved')        AS active_incidents,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600
          ) FILTER (WHERE i.state = 'resolved' AND i.closed_at IS NOT NULL),
          1
        )::TEXT                                                           AS avg_resolve_hours
      FROM authorities a
      JOIN platforms p ON p.authority_id = a.id
      LEFT JOIN incidents i ON i.platform_id = p.id
      GROUP BY a.id, a.name
      ORDER BY COUNT(DISTINCT i.id) FILTER (WHERE i.state <> 'resolved') DESC, a.name
    `,

    // All active incidents
    sql<{ id: string; state: string; opened_at: Date; platform_name: string; authority_name: string; cosign_count: string }[]>`
      SELECT
        i.id, i.state, i.opened_at,
        p.name  AS platform_name,
        a.name  AS authority_name,
        COUNT(r.id) FILTER (WHERE r.incident_id = i.id) AS cosign_count
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      JOIN authorities a ON a.id = p.authority_id
      LEFT JOIN reports r ON r.platform_id = i.platform_id
      WHERE i.state <> 'resolved'
      GROUP BY i.id, p.name, a.name
      ORDER BY i.opened_at ASC
    `,

    // Recently resolved (last 7 days)
    sql<{ id: string; opened_at: Date; closed_at: Date; platform_name: string; authority_name: string }[]>`
      SELECT i.id, i.opened_at, i.closed_at, p.name AS platform_name, a.name AS authority_name
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      JOIN authorities a ON a.id = p.authority_id
      WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '7 days'
      ORDER BY i.closed_at DESC
      LIMIT 10
    `,

    // SLA breaches: unacknowledged >4h, or unresolved >24h
    sql<{
      id: string; state: string; opened_at: Date; hours_open: string;
      platform_name: string; authority_name: string; breach_type: string;
    }[]>`
      SELECT
        i.id, i.state, i.opened_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - i.opened_at)) / 3600, 1)::TEXT AS hours_open,
        p.name  AS platform_name,
        a.name  AS authority_name,
        CASE
          WHEN i.state IN ('detected', 'confirmed') AND i.opened_at < NOW() - INTERVAL '4 hours'
            THEN 'unacknowledged'
          WHEN i.state <> 'resolved' AND i.opened_at < NOW() - INTERVAL '24 hours'
            THEN 'unresolved'
        END AS breach_type
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      JOIN authorities a ON a.id = p.authority_id
      WHERE i.state <> 'resolved'
        AND (
          (i.state IN ('detected', 'confirmed') AND i.opened_at < NOW() - INTERVAL '4 hours')
          OR (i.opened_at < NOW() - INTERVAL '24 hours')
        )
      ORDER BY i.opened_at ASC
    `,
  ]);

  return NextResponse.json({
    summary: summary[0],
    byAuthority,
    activeIncidents,
    recentResolved,
    slaBreaches,
  });
}
