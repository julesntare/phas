import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let op;
  try { op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const pid = op.platformId;

  const [uptime, probe24h, reports7d, incidentSummary] = await Promise.all([
    sql<{ d7: string | null; d30: string | null; d90: string | null }[]>`
      SELECT
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE ok AND ran_at > NOW() - INTERVAL '7 days')
          / NULLIF(COUNT(*) FILTER (WHERE ran_at > NOW() - INTERVAL '7 days'), 0), 1
        )::TEXT AS d7,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE ok AND ran_at > NOW() - INTERVAL '30 days')
          / NULLIF(COUNT(*) FILTER (WHERE ran_at > NOW() - INTERVAL '30 days'), 0), 1
        )::TEXT AS d30,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE ok)
          / NULLIF(COUNT(*), 0), 1
        )::TEXT AS d90
      FROM probe_results
      WHERE platform_id = ${pid} AND ran_at > NOW() - INTERVAL '90 days'
    `,

    sql<{ hour: string; ok_count: string; total: string }[]>`
      SELECT
        DATE_TRUNC('hour', ran_at)::TEXT AS hour,
        COUNT(*) FILTER (WHERE ok)::TEXT AS ok_count,
        COUNT(*)::TEXT                  AS total
      FROM probe_results
      WHERE platform_id = ${pid} AND ran_at > NOW() - INTERVAL '25 hours'
      GROUP BY DATE_TRUNC('hour', ran_at)
      ORDER BY hour ASC
    `,

    sql<{ day: string; count: string }[]>`
      SELECT DATE(created_at)::TEXT AS day, COUNT(*)::TEXT AS count
      FROM reports
      WHERE platform_id = ${pid} AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,

    sql<{ resolved: string; active: string }[]>`
      SELECT
        COUNT(*) FILTER (WHERE state = 'resolved')::TEXT  AS resolved,
        COUNT(*) FILTER (WHERE state <> 'resolved')::TEXT AS active
      FROM incidents WHERE platform_id = ${pid}
    `,
  ]);

  return NextResponse.json({
    uptime: {
      d7:  uptime[0]?.d7  != null ? Number(uptime[0].d7)  : null,
      d30: uptime[0]?.d30 != null ? Number(uptime[0].d30) : null,
      d90: uptime[0]?.d90 != null ? Number(uptime[0].d90) : null,
    },
    probe24h: probe24h.map(r => ({
      hour: r.hour,
      ok_count: Number(r.ok_count),
      total: Number(r.total),
    })),
    reports7d: reports7d.map(r => ({ day: r.day, count: Number(r.count) })),
    incidents: {
      resolved: Number(incidentSummary[0]?.resolved ?? 0),
      active: Number(incidentSummary[0]?.active ?? 0),
    },
  });
}
