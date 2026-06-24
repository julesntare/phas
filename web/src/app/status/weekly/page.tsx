import Link from 'next/link';
import sql from '@/lib/db';

export const revalidate = 3600;

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

interface PlatformStat {
  id: string; name: string; category: string;
  authority_name: string; avatar_url: string | null;
  uptime_7d: number | null;
  incidents_week: string; resolved_week: string;
  avg_resolution_hours: number | null;
  reports_week: string; cosigns_week: string;
}

function uptimeColor(u: number | null) {
  if (u == null) return 'text-gray-400';
  if (u >= 99) return 'text-green-600';
  if (u >= 95) return 'text-orange-500';
  return 'text-red-500';
}
function uptimeBg(u: number | null) {
  if (u == null) return 'bg-gray-100';
  if (u >= 99) return 'bg-green-50 border-green-200';
  if (u >= 95) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

function fmtHours(h: number | null) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function weekRange() {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export default async function WeeklyReportPage() {
  const platforms = await sql<PlatformStat[]>`
    SELECT
      p.id, p.name, p.category, p.avatar_url,
      a.name AS authority_name,
      ROUND(
        100.0 * COUNT(pr.id) FILTER (WHERE pr.ok     AND pr.ran_at > NOW() - INTERVAL '7 days')
              / NULLIF(COUNT(pr.id) FILTER (WHERE pr.ran_at > NOW() - INTERVAL '7 days'), 0)
      , 1) AS uptime_7d,
      COUNT(DISTINCT i.id)  FILTER (WHERE i.opened_at > NOW() - INTERVAL '7 days')                            AS incidents_week,
      COUNT(DISTINCT i.id)  FILTER (WHERE i.closed_at > NOW() - INTERVAL '7 days' AND i.state = 'resolved')   AS resolved_week,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600.0
      ) FILTER (WHERE i.closed_at IS NOT NULL AND i.closed_at > NOW() - INTERVAL '7 days' AND i.state = 'resolved'), 1)
        AS avg_resolution_hours,
      COUNT(DISTINCT r.id)  FILTER (WHERE r.created_at > NOW() - INTERVAL '7 days' AND r.type = 'affected')   AS reports_week,
      COUNT(DISTINCT r2.id) FILTER (WHERE r2.created_at > NOW() - INTERVAL '7 days')                          AS cosigns_week
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN probe_results pr ON pr.platform_id = p.id
    LEFT JOIN incidents i      ON i.platform_id  = p.id
    LEFT JOIN reports r        ON r.platform_id  = p.id
    LEFT JOIN reports r2       ON r2.platform_id = p.id AND r2.incident_id IS NOT NULL
    GROUP BY p.id, a.name
    ORDER BY uptime_7d DESC NULLS LAST, p.name
  `;

  const totalPlatforms   = platforms.length;
  const avgUptime        = platforms.filter(p => p.uptime_7d != null).length > 0
    ? (platforms.reduce((s, p) => s + (p.uptime_7d ?? 0), 0) / platforms.filter(p => p.uptime_7d != null).length).toFixed(1)
    : null;
  const totalIncidents   = platforms.reduce((s, p) => s + Number(p.incidents_week), 0);
  const totalResolved    = platforms.reduce((s, p) => s + Number(p.resolved_week), 0);
  const totalReports     = platforms.reduce((s, p) => s + Number(p.reports_week), 0);
  const totalCosigns     = platforms.reduce((s, p) => s + Number(p.cosigns_week), 0);
  const perfectUptime    = platforms.filter(p => p.uptime_7d === 100).length;

  const range = weekRange();
  const shareUrl = `${BASE_URL}/status/weekly`;
  const shareText = [
    `📊 PHAS Weekly Report (${range}):`,
    `• ${totalPlatforms} platforms monitored`,
    avgUptime ? `• ${avgUptime}% avg uptime` : null,
    `• ${totalIncidents} incident${totalIncidents !== 1 ? 's' : ''} detected, ${totalResolved} resolved`,
    `• ${totalReports} citizen reports · ${totalCosigns} co-signs`,
    '',
    `Full report: ${shareUrl}`,
  ].filter(l => l !== null).join('\n');

  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/status"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Status
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-semibold text-gray-700">Weekly Report</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">PHAS Weekly Report</p>
              <h1 className="text-2xl font-extrabold text-gray-900">{range}</h1>
              <p className="text-sm text-gray-500 mt-1">{totalPlatforms} platforms monitored across Rwanda</p>
            </div>
            {/* Share buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors no-underline">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#25D366] text-white hover:bg-[#1ebe5d] transition-colors no-underline">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Platforms',      value: totalPlatforms,                    color: 'text-gray-900' },
            { label: 'Avg uptime',     value: avgUptime ? `${avgUptime}%` : '—', color: avgUptime && Number(avgUptime) >= 99 ? 'text-green-600' : 'text-orange-500' },
            { label: 'Incidents',      value: totalIncidents,                    color: totalIncidents === 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'Resolved',       value: totalResolved,                     color: 'text-gray-900' },
            { label: 'Reports',        value: totalReports,                      color: 'text-gray-900' },
            { label: '100% uptime',    value: perfectUptime,                     color: perfectUptime > 0 ? 'text-green-600' : 'text-gray-400' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Per-platform table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-700">Platform performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="text-left px-6 py-3 font-semibold">Platform</th>
                  <th className="text-right px-4 py-3 font-semibold">Uptime 7d</th>
                  <th className="text-right px-4 py-3 font-semibold">Incidents</th>
                  <th className="text-right px-4 py-3 font-semibold">Resolved</th>
                  <th className="text-right px-4 py-3 font-semibold">Avg fix</th>
                  <th className="text-right px-4 py-3 font-semibold">Reports</th>
                  <th className="text-right px-6 py-3 font-semibold">Co-signs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {platforms.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/status/platforms/${p.id}`} className="flex items-center gap-2 no-underline group">
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatar_url} alt={p.name} className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                            {p.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.authority_name}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${uptimeBg(p.uptime_7d)} ${uptimeColor(p.uptime_7d)}`}>
                        {p.uptime_7d != null ? `${p.uptime_7d}%` : '—'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${Number(p.incidents_week) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {p.incidents_week}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{p.resolved_week}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmtHours(p.avg_resolution_hours)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{p.reports_week}</td>
                    <td className="px-6 py-3 text-right text-gray-500">{p.cosigns_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Highlights */}
        {platforms.length > 0 && (() => {
          const best    = [...platforms].sort((a, b) => (b.uptime_7d ?? 0) - (a.uptime_7d ?? 0))[0];
          const mostRep = [...platforms].sort((a, b) => Number(b.reports_week) - Number(a.reports_week))[0];
          const fastest = platforms.filter(p => p.avg_resolution_hours != null)
            .sort((a, b) => (a.avg_resolution_hours ?? 99999) - (b.avg_resolution_hours ?? 99999))[0];
          return (
            <div className="grid sm:grid-cols-3 gap-3">
              {best?.uptime_7d === 100 && (
                <HighlightCard icon="🏆" label="Perfect uptime" value={best.name} sub="100% this week" />
              )}
              {Number(mostRep?.reports_week) > 0 && (
                <HighlightCard icon="📣" label="Most reported" value={mostRep.name} sub={`${mostRep.reports_week} citizen reports`} />
              )}
              {fastest && (
                <HighlightCard icon="⚡" label="Fastest resolution" value={fastest.name} sub={`Resolved in ${fmtHours(fastest.avg_resolution_hours)}`} />
              )}
            </div>
          );
        })()}

        <p className="text-center text-xs text-gray-400 pb-4">
          Data covers the last 7 days · Updates hourly ·{' '}
          <Link href="/status" className="text-blue-500 hover:underline">View live status</Link>
        </p>
      </div>
    </div>
  );
}

function HighlightCard({ icon, label, value, sub }: {
  icon: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm text-center">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-extrabold text-gray-800 mt-1 truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
