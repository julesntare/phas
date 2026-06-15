import Link from 'next/link';
import { notFound } from 'next/navigation';
import sql from '@/lib/db';

export const revalidate = 60;

interface IncidentRow {
  id: string; state: string; opened_at: string; closed_at: string | null;
  recurrence_count: number; event_count: string;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Investigating', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially resolved', recurred: 'Recurred', resolved: 'Resolved',
};
const STATE_CLASSES: Record<string, string> = {
  detected:           'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:          'bg-red-50 text-red-700 border-red-200',
  acknowledged:       'bg-orange-50 text-orange-700 border-orange-200',
  partially_resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  recurred:           'bg-red-50 text-red-800 border-red-300',
  resolved:           'bg-green-50 text-green-700 border-green-200',
};

function formatDuration(from: string, to: string) {
  const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-RW', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function PlatformHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [platformRows, incidentRows, uptimeRows] = await Promise.all([
    sql<{ name: string; category: string; authority_name: string; operator_avatar_url: string | null }[]>`
      SELECT p.name, p.category, a.name AS authority_name, op.avatar_url AS operator_avatar_url
      FROM platforms p
      JOIN authorities a ON a.id = p.authority_id
      LEFT JOIN LATERAL (
        SELECT avatar_url FROM help_desk_accounts
        WHERE platform_id = p.id AND avatar_url IS NOT NULL
        LIMIT 1
      ) op ON TRUE
      WHERE p.id = ${id}
    `,
    sql<IncidentRow[]>`
      SELECT i.id, i.state, i.opened_at, i.closed_at, i.recurrence_count,
             COUNT(e.id) AS event_count
      FROM incidents i
      LEFT JOIN incident_events e ON e.incident_id = i.id
      WHERE i.platform_id = ${id}
      GROUP BY i.id
      ORDER BY i.opened_at DESC
      LIMIT 50
    `,
    sql<{ uptime_7d: number | null; uptime_30d: number | null }[]>`
      SELECT
        ROUND(100.0 * COUNT(*) FILTER (WHERE ok = TRUE AND ran_at > NOW() - INTERVAL '7 days')
              / NULLIF(COUNT(*) FILTER (WHERE ran_at > NOW() - INTERVAL '7 days'), 0), 2) AS uptime_7d,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ok = TRUE AND ran_at > NOW() - INTERVAL '30 days')
              / NULLIF(COUNT(*) FILTER (WHERE ran_at > NOW() - INTERVAL '30 days'), 0), 2) AS uptime_30d
      FROM probe_results
      WHERE platform_id = ${id}
    `,
  ]);

  if (platformRows.length === 0) notFound();

  const platform = platformRows[0];
  const uptime = uptimeRows[0];
  const activeIncidents = incidentRows.filter(i => i.state !== 'resolved');
  const resolvedIncidents = incidentRows.filter(i => i.state === 'resolved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/status"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Status
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-semibold text-gray-700 truncate">{platform.name}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Platform header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {platform.operator_avatar_url ? (
                <img
                  src={platform.operator_avatar_url}
                  alt={platform.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xl font-bold text-gray-400">
                  {platform.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-gray-900">{platform.name}</h1>
                <p className="text-sm text-gray-500 mt-1">{platform.authority_name} · {platform.category}</p>
              </div>
            </div>
            <div className="flex gap-6">
              {uptime.uptime_7d != null && (
                <div className="text-right">
                  <p className={`text-2xl font-extrabold ${uptime.uptime_7d >= 99 ? 'text-green-600' : uptime.uptime_7d >= 95 ? 'text-orange-500' : 'text-red-500'}`}>
                    {uptime.uptime_7d}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">7-day uptime</p>
                </div>
              )}
              {uptime.uptime_30d != null && (
                <div className="text-right">
                  <p className={`text-2xl font-extrabold ${uptime.uptime_30d >= 99 ? 'text-green-600' : uptime.uptime_30d >= 95 ? 'text-orange-500' : 'text-red-500'}`}>
                    {uptime.uptime_30d}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">30-day uptime</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-3">
              Active ({activeIncidents.length})
            </h2>
            <div className="space-y-2">
              {activeIncidents.map(inc => (
                <IncidentRow key={inc.id} incident={inc} />
              ))}
            </div>
          </section>
        )}

        {/* Incident history */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Incident history
            </h2>
            <span className="text-xs text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
              {resolvedIncidents.length} resolved
            </span>
          </div>
          {resolvedIncidents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-semibold text-gray-700">No past incidents</p>
              <p className="text-sm text-gray-400 mt-1">This platform has no resolved incidents on record.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resolvedIncidents.map(inc => (
                <IncidentRow key={inc.id} incident={inc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function IncidentRow({ incident: inc }: { incident: IncidentRow }) {
  const cls = STATE_CLASSES[inc.state] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
              {STATE_LABEL[inc.state] ?? inc.state}
            </span>
            {inc.recurrence_count > 0 && (
              <span className="text-xs text-red-500 font-semibold">
                Recurrence #{inc.recurrence_count}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {formatDate(inc.opened_at)}
            {inc.closed_at && (
              <> — {formatDate(inc.closed_at)}</>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          {inc.closed_at ? (
            <p className="text-sm font-bold text-gray-700">
              {formatDuration(inc.opened_at, inc.closed_at)}
            </p>
          ) : (
            <p className="text-sm font-bold text-red-500">Ongoing</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{inc.event_count} updates</p>
        </div>
      </div>
    </div>
  );
}
