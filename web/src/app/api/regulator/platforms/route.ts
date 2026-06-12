import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireRegulatorAuth } from '@/lib/regulator-auth';

export async function GET(req: NextRequest) {
  try { await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const platforms = await sql<{
    platform_id: string; platform_name: string; category: string;
    authority_id: string; authority_name: string;
    uptime_7d: string | null; active_incidents: string;
    resolved_30d: string; avg_resolve_hours_30d: string | null;
  }[]>`
    SELECT
      p.id   AS platform_id,
      p.name AS platform_name,
      p.category,
      a.id   AS authority_id,
      a.name AS authority_name,
      ROUND(
        100.0
        * COUNT(pr.id) FILTER (WHERE pr.ok)
        / NULLIF(COUNT(pr.id), 0),
        1
      )::TEXT AS uptime_7d,
      COUNT(DISTINCT i.id) FILTER (WHERE i.state <> 'resolved')::TEXT           AS active_incidents,
      COUNT(DISTINCT i.id) FILTER (
        WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '30 days'
      )::TEXT                                                                     AS resolved_30d,
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600
        ) FILTER (
          WHERE i.state = 'resolved' AND i.closed_at > NOW() - INTERVAL '30 days'
        ),
        1
      )::TEXT                                                                     AS avg_resolve_hours_30d
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN probe_results pr ON pr.platform_id = p.id
      AND pr.ran_at > NOW() - INTERVAL '7 days'
    LEFT JOIN incidents i ON i.platform_id = p.id
    GROUP BY p.id, p.name, p.category, a.id, a.name
    ORDER BY a.name, p.name
  `;

  return NextResponse.json(
    platforms.map(r => ({
      ...r,
      uptime_7d: r.uptime_7d != null ? Number(r.uptime_7d) : null,
      active_incidents: Number(r.active_incidents),
      resolved_30d: Number(r.resolved_30d),
    }))
  );
}
