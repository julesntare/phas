import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireRegulatorAuth } from '@/lib/regulator-auth';

export async function GET(req: NextRequest) {
  try { await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [weekly, byAuthority] = await Promise.all([
    sql<{ week_start: string; opened: string; resolved: string }[]>`
      SELECT
        DATE_TRUNC('week', opened_at)::DATE::TEXT AS week_start,
        COUNT(*)::TEXT                            AS opened,
        COUNT(*) FILTER (WHERE state = 'resolved')::TEXT AS resolved
      FROM incidents
      WHERE opened_at > NOW() - INTERVAL '91 days'
      GROUP BY DATE_TRUNC('week', opened_at)
      ORDER BY week_start ASC
    `,

    sql<{
      authority_name: string;
      total_incidents: string;
      resolved_count: string;
      avg_resolve_hours: string | null;
    }[]>`
      SELECT
        a.name                                    AS authority_name,
        COUNT(i.id)::TEXT                         AS total_incidents,
        COUNT(i.id) FILTER (WHERE i.state = 'resolved')::TEXT AS resolved_count,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600
          ) FILTER (WHERE i.state = 'resolved' AND i.closed_at IS NOT NULL),
          1
        )::TEXT                                   AS avg_resolve_hours
      FROM authorities a
      JOIN platforms p ON p.authority_id = a.id
      LEFT JOIN incidents i ON i.platform_id = p.id
        AND i.opened_at > NOW() - INTERVAL '91 days'
      GROUP BY a.id, a.name
      ORDER BY COUNT(i.id) DESC
    `,
  ]);

  return NextResponse.json({
    weekly: weekly.map(r => ({
      week_start: r.week_start,
      opened: Number(r.opened),
      resolved: Number(r.resolved),
    })),
    byAuthority: byAuthority.map(r => ({
      authority_name: r.authority_name,
      total_incidents: Number(r.total_incidents),
      resolved_count: Number(r.resolved_count),
      avg_resolve_hours: r.avg_resolve_hours != null ? Number(r.avg_resolve_hours) : null,
    })),
  });
}
