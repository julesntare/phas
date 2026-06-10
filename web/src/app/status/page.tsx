import Link from 'next/link';
import sql from '@/lib/db';

export const revalidate = 60;

interface PlatformRow {
  id: string; name: string; category: string;
  authority_name: string; state: string | null;
  opened_at: string | null; uptime_7d: number | null;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Investigating', confirmed: 'Confirmed issue',
  acknowledged: 'Acknowledged', partially_resolved: 'Partially resolved', recurred: 'Recurred',
};
const STATE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  detected:           { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  confirmed:          { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  acknowledged:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200'},
  partially_resolved: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200'},
  recurred:           { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300'   },
};

function uptimeColor(u: number) {
  if (u >= 99) return 'text-green-600';
  if (u >= 95) return 'text-orange-500';
  return 'text-red-500';
}

export default async function StatusPage() {
  const platforms = await sql<PlatformRow[]>`
    SELECT p.id, p.name, p.category, a.name AS authority_name, i.state, i.opened_at, u.uptime_7d
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
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
  const hasIssue = p.state !== null;
  const sc = hasIssue ? (STATE_COLOR[p.state!] ?? STATE_COLOR.confirmed) : null;
  const label = hasIssue ? (STATE_LABEL[p.state!] ?? p.state!) : 'Operational';

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 flex items-center justify-between gap-4 shadow-sm">
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
          hasIssue
            ? `${sc!.bg} ${sc!.text} ${sc!.border}`
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {label}
        </span>
      </div>
    </div>
  );
}
