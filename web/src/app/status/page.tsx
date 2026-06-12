import Link from 'next/link';
import Image from 'next/image';
import sql from '@/lib/db';

export const revalidate = 60;

interface IncidentSummary {
  id: string; state: string; opened_at: string; closed_at: string | null;
}
interface MaintenanceInfo {
  id: string; title: string; starts_at: string; ends_at: string;
}
interface PlatformRow {
  id: string; name: string; category: string;
  authority_name: string; state: string | null;
  opened_at: string | null; uptime_7d: number | null;
  history: IncidentSummary[] | null;
  maintenance: MaintenanceInfo | null;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Investigating', confirmed: 'Confirmed issue',
  acknowledged: 'Acknowledged', partially_resolved: 'Partially resolved', recurred: 'Recurred',
};
const HIST_DOT: Record<string, string> = {
  resolved: 'bg-green-400', detected: 'bg-amber-400', confirmed: 'bg-red-500',
  acknowledged: 'bg-orange-400', partially_resolved: 'bg-violet-400', recurred: 'bg-red-700',
};
const STATE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  detected:           { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  confirmed:          { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  acknowledged:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200'},
  partially_resolved: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200'},
  recurred:           { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300'   },
};

function formatDuration(from: string, to: string) {
  const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

function uptimeColor(u: number) {
  if (u >= 99) return 'text-green-600';
  if (u >= 95) return 'text-orange-500';
  return 'text-red-500';
}

export default async function StatusPage() {
  const platforms = await sql<PlatformRow[]>`
    SELECT
      p.id, p.name, p.category, a.name AS authority_name,
      i.state, i.opened_at, u.uptime_7d,
      COALESCE(hist.history, '[]'::json) AS history,
      ROW_TO_JSON(mw.*) AS maintenance
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN LATERAL (
      SELECT state, opened_at FROM incidents
      WHERE platform_id = p.id AND state <> 'resolved'
      ORDER BY opened_at DESC LIMIT 1
    ) i ON TRUE
    LEFT JOIN LATERAL (
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ok = TRUE) / NULLIF(COUNT(*), 0), 1) AS uptime_7d
      FROM probe_results WHERE platform_id = p.id AND ran_at > NOW() - INTERVAL '7 days'
    ) u ON TRUE
    LEFT JOIN LATERAL (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT('id', sub.id, 'state', sub.state, 'opened_at', sub.opened_at, 'closed_at', sub.closed_at)
      ) AS history
      FROM (
        SELECT id, state, opened_at, closed_at
        FROM incidents
        WHERE platform_id = p.id
        ORDER BY opened_at DESC
        LIMIT 5
      ) sub
    ) hist ON TRUE
    LEFT JOIN LATERAL (
      SELECT id, title, starts_at, ends_at
      FROM maintenance_windows
      WHERE platform_id = p.id
        AND starts_at <= NOW() + INTERVAL '24 hours'
        AND ends_at > NOW()
      ORDER BY starts_at ASC LIMIT 1
    ) mw ON TRUE
    ORDER BY p.name
  `;

  const issues = platforms.filter(p => p.state !== null);
  const operational = platforms.filter(p => p.state === null);
  const allOk = issues.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand font-bold text-sm no-underline">
            <Image src="/phas-icon.png" alt="PHAS" width={24} height={24} className="rounded-md" />
            PHAS
          </Link>
          <span className="text-xs text-gray-400">
            Updated {new Date().toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero banner */}
        <div className={`rounded-2xl p-6 mb-8 ${allOk ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${allOk ? 'bg-green-100' : 'bg-orange-100'}`}>
              {allOk ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className={`text-xl font-extrabold ${allOk ? 'text-green-800' : 'text-orange-800'}`}>
                {allOk ? 'All systems operational' : `${issues.length} platform${issues.length > 1 ? 's' : ''} affected`}
              </h1>
              <p className={`text-sm mt-0.5 ${allOk ? 'text-green-600' : 'text-orange-600'}`}>
                {allOk
                  ? `${platforms.length} platforms monitored — no active incidents`
                  : `${operational.length} of ${platforms.length} platforms running normally`}
              </p>
            </div>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-3">
              Active issues ({issues.length})
            </h2>
            <div className="space-y-2">
              {issues.map(p => <PlatformCard key={p.id} platform={p} />)}
            </div>
          </section>
        )}

        {/* Operational */}
        <section>
          <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3">
            Operational ({operational.length})
          </h2>
          <div className="space-y-2">
            {operational.map(p => <PlatformCard key={p.id} platform={p} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function PlatformCard({ platform: p }: { platform: PlatformRow }) {
  const now = new Date();
  const mw = p.maintenance;
  const isUnderMaintenance = mw ? new Date(mw.starts_at) <= now : false;
  const isUpcomingMaintenance = mw && !isUnderMaintenance;

  const hasIssue = p.state !== null && !isUnderMaintenance;
  const sc = hasIssue ? (STATE_COLOR[p.state!] ?? STATE_COLOR.confirmed) : null;
  const label = isUnderMaintenance
    ? 'Maintenance'
    : hasIssue ? (STATE_LABEL[p.state!] ?? p.state!) : 'Operational';

  const pastIncidents = (p.history ?? []).filter(h => h.state === 'resolved');

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{p.authority_name} · {p.category}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {p.uptime_7d != null && (
            <span className={`text-xs font-semibold ${uptimeColor(p.uptime_7d)}`}>
              {p.uptime_7d}%
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isUnderMaintenance
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : hasIssue
                ? `${sc!.bg} ${sc!.text} ${sc!.border}`
                : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {label}
          </span>
          <Link href={`/status/platforms/${p.id}`}
            className="text-gray-300 hover:text-brand transition-colors no-underline"
            title="View full history">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Maintenance notice */}
      {mw && (
        <div className={`px-4 py-2.5 border-t flex items-center gap-2 ${
          isUnderMaintenance
            ? 'border-blue-100 bg-blue-50/60'
            : 'border-gray-50 bg-gray-50/40'
        }`}>
          <svg className={`w-3.5 h-3.5 shrink-0 ${isUnderMaintenance ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className={`text-xs ${isUnderMaintenance ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
            {isUnderMaintenance ? `Maintenance: ${mw.title}` : `Upcoming maintenance: ${mw.title}`}
          </p>
          {isUpcomingMaintenance && (
            <span className="ml-auto text-xs text-gray-400 shrink-0">
              {new Date(mw.starts_at).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {/* Collapsible past-incidents strip (no JS — pure HTML details) */}
      {pastIncidents.length > 0 && (
        <details className="group border-t border-gray-50">
          <summary className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 cursor-pointer hover:bg-gray-50/70 transition-colors select-none">
            <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90 shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {pastIncidents.length} past incident{pastIncidents.length > 1 ? 's' : ''}
          </summary>
          <div className="divide-y divide-gray-50">
            {pastIncidents.map(inc => (
              <div key={inc.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${HIST_DOT[inc.state] ?? 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-600">
                    {new Date(inc.opened_at).toLocaleDateString('en-RW', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium shrink-0">
                  {inc.closed_at ? formatDuration(inc.opened_at, inc.closed_at) : 'Ongoing'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
