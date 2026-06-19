import Link from 'next/link';
import { notFound } from 'next/navigation';
import sql from '@/lib/db';
import LocalDate from '@/components/LocalDate';
import CoSignButton from './CoSignButton';

export const revalidate = 60;

interface IncidentRow {
  id: string; state: string; opened_at: string; closed_at: string | null;
  recurrence_count: number; event_count: string; cosign_count: string;
}
interface ReportRow {
  id: string; type: 'affected' | 'ok'; created_at: string;
  district: string | null; free_text: string | null;
  is_anonymous: boolean; reporter_name: string | null;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Reported', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
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

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
};

export default async function PlatformHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [platformRows, incidentRows, uptimeRows, reportRows] = await Promise.all([
    sql<{ name: string; category: string; authority_name: string; operator_avatar_url: string | null }[]>`
      SELECT p.name, p.category, a.name AS authority_name, p.avatar_url AS operator_avatar_url
      FROM platforms p
      JOIN authorities a ON a.id = p.authority_id
      WHERE p.id = ${id}
    `,
    sql<IncidentRow[]>`
      SELECT i.id, i.state, i.opened_at, i.closed_at, i.recurrence_count,
             COUNT(DISTINCT e.id) AS event_count,
             COUNT(DISTINCT r.id) AS cosign_count
      FROM incidents i
      LEFT JOIN incident_events e ON e.incident_id = i.id
      LEFT JOIN reports r ON r.incident_id = i.id
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
    sql<ReportRow[]>`
      SELECT r.id, r.type, r.created_at, r.district, r.free_text, r.is_anonymous,
             CASE WHEN r.is_anonymous THEN NULL ELSE ca.name END AS reporter_name
      FROM reports r
      LEFT JOIN citizen_accounts ca ON ca.id = r.reporter_id
      WHERE r.platform_id = ${id}
        AND r.created_at > NOW() - INTERVAL '48 hours'
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
  ]);

  if (platformRows.length === 0) notFound();

  const platform = platformRows[0];
  const uptime = uptimeRows[0];
  const activeIncidents = incidentRows.filter(i => i.state !== 'resolved');
  const resolvedIncidents = incidentRows.filter(i => i.state === 'resolved');
  const affectedCount = reportRows.filter(r => r.type === 'affected').length;
  const okCount = reportRows.filter(r => r.type === 'ok').length;

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

        {/* Crowd reports (last 48h) */}
        {reportRows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Citizen reports
              </h2>
              <div className="flex items-center gap-2 text-xs">
                {affectedCount > 0 && (
                  <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                    {affectedCount} affected
                  </span>
                )}
                {okCount > 0 && (
                  <span className="bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                    {okCount} ok
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {reportRows.map(r => (
                <ReportCard key={r.id} report={r} />
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

function ReportCard({ report: r }: { report: ReportRow }) {
  const isAffected = r.type === 'affected';
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
        isAffected
          ? 'bg-red-50 text-red-600 border-red-200'
          : 'bg-green-50 text-green-600 border-green-200'
      }`}>
        {isAffected ? 'Affected' : 'OK'}
      </span>
      <div className="min-w-0 flex-1">
        {r.free_text && (
          <p className="text-sm text-gray-700 leading-snug">{r.free_text}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
          <LocalDate date={r.created_at} options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }} />
          {r.district && <span>· {r.district}</span>}
          {r.reporter_name && !r.is_anonymous && (
            <span className="text-gray-500">· {r.reporter_name}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function IncidentRow({ incident: inc }: { incident: IncidentRow }) {
  const cls = STATE_CLASSES[inc.state] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  const isActive = inc.state !== 'resolved';
  const cosignCount = Number(inc.cosign_count);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <Link
        href={`/status/incidents/${inc.id}`}
        className="block px-4 py-3.5 hover:bg-gray-50/60 transition-colors no-underline"
      >
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
              <LocalDate date={inc.opened_at} options={DATE_OPTS} />
              {inc.closed_at && (
                <> — <LocalDate date={inc.closed_at} options={DATE_OPTS} /></>
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
      </Link>
      {/* Co-sign strip — only on active incidents */}
      {isActive && (
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {cosignCount > 0
              ? `${cosignCount} ${cosignCount === 1 ? 'person' : 'people'} affected`
              : 'No confirmations yet'}
          </span>
          <CoSignButton incidentId={inc.id} />
        </div>
      )}
    </div>
  );
}
