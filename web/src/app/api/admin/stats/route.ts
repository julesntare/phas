import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [summary, activeIncidents, slaBreaches, pendingSuggestions, recentReports, recentResolved] = await Promise.all([
    sql<{
      total_platforms: string;
      platforms_with_issues: string;
      active_incidents: string;
      resolved_this_week: string;
      reports_this_week: string;
    }[]>`
      SELECT
        COUNT(DISTINCT p.id)                                                                     AS total_platforms,
        COUNT(DISTINCT p.id) FILTER (WHERE i.id IS NOT NULL AND i.state <> 'resolved')           AS platforms_with_issues,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state <> 'resolved')                               AS active_incidents,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '7 days') AS resolved_this_week,
        (SELECT COUNT(*) FROM reports WHERE created_at > NOW() - INTERVAL '7 days')             AS reports_this_week
      FROM platforms p
      LEFT JOIN incidents i ON i.platform_id = p.id
    `,

    sql<{
      id: string; state: string; opened_at: Date; hours_open: string;
      platform_name: string; authority_name: string;
    }[]>`
      SELECT
        i.id, i.state, i.opened_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - i.opened_at)) / 3600, 1)::TEXT AS hours_open,
        p.name AS platform_name,
        a.name AS authority_name
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      JOIN authorities a ON a.id = p.authority_id
      WHERE i.state <> 'resolved'
      ORDER BY i.opened_at ASC
    `,

    sql<{
      id: string; state: string; opened_at: Date; hours_open: string;
      platform_name: string; breach_type: string;
    }[]>`
      SELECT
        i.id, i.state, i.opened_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - i.opened_at)) / 3600, 1)::TEXT AS hours_open,
        p.name AS platform_name,
        CASE
          WHEN i.state IN ('detected','confirmed') AND i.opened_at < NOW() - INTERVAL '4 hours' THEN 'unacknowledged'
          WHEN i.opened_at < NOW() - INTERVAL '24 hours' THEN 'unresolved'
        END AS breach_type
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      WHERE i.state <> 'resolved'
        AND (
          (i.state IN ('detected','confirmed') AND i.opened_at < NOW() - INTERVAL '4 hours')
          OR (i.opened_at < NOW() - INTERVAL '24 hours')
        )
      ORDER BY i.opened_at ASC
    `,

    sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM suggestions WHERE status = 'pending'`,

    sql<{ id: string; platform_name: string; type: string; created_at: Date }[]>`
      SELECT r.id, p.name AS platform_name, r.type, r.created_at
      FROM reports r
      JOIN platforms p ON p.id = r.platform_id
      WHERE r.created_at > NOW() - INTERVAL '7 days'
      ORDER BY r.created_at DESC
      LIMIT 20
    `,

    sql<{ id: string; platform_name: string; opened_at: Date; closed_at: Date; hours_to_resolve: string }[]>`
      SELECT
        i.id, p.name AS platform_name, i.opened_at, i.closed_at,
        ROUND(EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600, 1)::TEXT AS hours_to_resolve
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '7 days'
      ORDER BY i.closed_at DESC
      LIMIT 10
    `,
  ]);

  return NextResponse.json({
    summary: summary[0],
    activeIncidents,
    slaBreaches,
    pendingSuggestions: Number(pendingSuggestions[0]?.count ?? 0),
    recentReports,
    recentResolved,
  });
}
