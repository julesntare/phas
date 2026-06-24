import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendWeeklyReport } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_REPORT_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE;
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_REPORT_EMAIL not configured' }, { status: 500 });
  }

  const platforms = await sql<{
    uptime_7d: number | null;
    incidents_week: string;
    resolved_week: string;
    reports_week: string;
  }[]>`
    SELECT
      ROUND(
        100.0 * COUNT(pr.id) FILTER (WHERE pr.ok     AND pr.ran_at > NOW() - INTERVAL '7 days')
              / NULLIF(COUNT(pr.id) FILTER (WHERE pr.ran_at > NOW() - INTERVAL '7 days'), 0)
      , 1) AS uptime_7d,
      COUNT(DISTINCT i.id) FILTER (WHERE i.opened_at > NOW() - INTERVAL '7 days')                          AS incidents_week,
      COUNT(DISTINCT i.id) FILTER (WHERE i.closed_at > NOW() - INTERVAL '7 days' AND i.state = 'resolved') AS resolved_week,
      COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days')                         AS reports_week
    FROM platforms p
    LEFT JOIN probe_results pr ON pr.platform_id = p.id
    LEFT JOIN incidents i      ON i.platform_id  = p.id
    LEFT JOIN reports r        ON r.platform_id  = p.id
    GROUP BY p.id
  `;

  const now   = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 6);
  const fmt   = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const range = `${fmt(start)} – ${fmt(now)}, ${now.getFullYear()}`;

  const withUptime       = platforms.filter(p => p.uptime_7d != null);
  const avgUptime        = withUptime.length > 0
    ? (withUptime.reduce((s, p) => s + (p.uptime_7d ?? 0), 0) / withUptime.length).toFixed(1)
    : null;
  const totalIncidents   = platforms.reduce((s, p) => s + Number(p.incidents_week), 0);
  const totalResolved    = platforms.reduce((s, p) => s + Number(p.resolved_week), 0);
  const totalReports     = platforms.reduce((s, p) => s + Number(p.reports_week), 0);
  const perfectUptime    = platforms.filter(p => p.uptime_7d === 100).length;
  const baseUrl          = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

  await sendWeeklyReport({
    to: [adminEmail],
    range,
    totalPlatforms: platforms.length,
    avgUptime,
    totalIncidents,
    totalResolved,
    totalReports,
    perfectUptime,
    reportUrl: `${baseUrl}/status/weekly`,
  });

  return NextResponse.json({ sent: true, range, to: adminEmail });
}
