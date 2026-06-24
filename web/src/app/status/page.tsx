import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import sql from '@/lib/db';
import StatusBody, { type PlatformRow } from './StatusBody';
import LocalDate from '@/components/LocalDate';
import CitizenProfileButton from '@/components/CitizenProfileButton';

export const revalidate = 60;

export default async function StatusPage() {
  const platforms = await sql<PlatformRow[]>`
    SELECT
      p.id, p.name, p.category, a.name AS authority_name,
      i.state, i.opened_at, u.uptime_7d,
      COALESCE(hist.history, '[]'::json) AS history,
      ROW_TO_JSON(mw.*) AS maintenance,
      p.avatar_url AS operator_avatar_url
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

  const issues      = platforms.filter(p => p.state !== null);
  const operational = platforms.filter(p => p.state === null);
  const allOk       = issues.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand font-bold text-sm no-underline">
            <Image src="/phas-icon.png" alt="PHAS" width={24} height={24} className="rounded-md" />
            PHAS
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/status/weekly"
              className="text-xs text-gray-500 hover:text-gray-800 no-underline hidden sm:block transition-colors">
              Weekly report
            </Link>
            <span className="text-xs text-gray-400 hidden sm:block">
              Updated <LocalDate options={{ hour: '2-digit', minute: '2-digit' }} />
            </span>
            <CitizenProfileButton />
          </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className={`text-xl font-extrabold ${allOk ? 'text-green-800' : 'text-orange-800'}`}>
                {allOk
                  ? 'All systems operational'
                  : `${issues.length} platform${issues.length > 1 ? 's' : ''} affected`}
              </h1>
              <p className={`text-sm mt-0.5 ${allOk ? 'text-green-600' : 'text-orange-600'}`}>
                {allOk
                  ? `${platforms.length} platforms monitored — no active incidents`
                  : `${operational.length} of ${platforms.length} platforms running normally`}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive body: tabs + search + filter + cards */}
        <Suspense>
          <StatusBody platforms={platforms} />
        </Suspense>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} PHAS — Rwanda
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors no-underline">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors no-underline">Terms of Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
