import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import sql from '@/lib/db';
import SignOutButton from './SignOutButton';
import LocalDate from '@/components/LocalDate';

export const dynamic = 'force-dynamic';

interface ReportRow {
  platform_name: string;
  type: string;
  created_at: string;
  is_anonymous: boolean;
}

interface SuggestionRow {
  id: string;
  platform_name: string;
  title: string;
  body: string;
  category: string;
  status: string;
  upvotes: number;
  admin_note: string | null;
  operator_note: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:      { label: 'Under review',  cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
  public:       { label: 'Public',        cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
  dismissed:    { label: 'Dismissed',     cls: 'bg-gray-100 text-gray-500 border-gray-200'      },
  forwarded:    { label: 'Forwarded',     cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-teal-50 text-teal-700 border-teal-200'       },
  planned:      { label: 'Planned',       cls: 'bg-green-50 text-green-700 border-green-200'    },
  declined:     { label: 'Declined',      cls: 'bg-red-50 text-red-600 border-red-200'          },
};

export default async function CitizenProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/status');

  // citizenId may be undefined if the JWT was minted before migration 011.
  // Fall back to an email lookup so the page still renders.
  let citizenId: string | undefined = session.user.id;

  if (!citizenId && session.user.email) {
    const [found] = await sql<{ id: string }[]>`
      SELECT id FROM citizen_accounts WHERE email = ${session.user.email}
    `.catch(() => [undefined]);
    citizenId = found?.id;
  }

  const [citizen] = citizenId
    ? await sql<{ name: string; email: string; avatar_url: string | null; created_at: string }[]>`
        SELECT name, email, avatar_url, created_at FROM citizen_accounts WHERE id = ${citizenId}
      `.catch(() => [undefined])
    : [undefined];

  const [reports, suggestions]: [ReportRow[], SuggestionRow[]] = await Promise.all([
    citizenId
      ? sql<ReportRow[]>`
          SELECT p.name AS platform_name, r.type, r.created_at, r.is_anonymous
          FROM reports r
          JOIN platforms p ON p.id = r.platform_id
          WHERE r.reporter_id = ${citizenId}
          ORDER BY r.created_at DESC
          LIMIT 30
        `.catch(() => [])
      : Promise.resolve([]),
    citizenId
      ? sql<SuggestionRow[]>`
          SELECT s.id, p.name AS platform_name, s.title, s.body, s.category,
                 s.status, s.upvotes, s.admin_note, s.operator_note, s.created_at
          FROM suggestions s
          JOIN platforms p ON p.id = s.platform_id
          WHERE s.reporter_id = ${citizenId}
          ORDER BY s.created_at DESC
        `.catch(() => [])
      : Promise.resolve([]),
  ]);

  const name   = citizen?.name ?? session.user.name ?? 'Citizen';
  const email  = citizen?.email ?? session.user.email ?? '';
  const avatar = citizen?.avatar_url ?? session.user.image ?? null;
  const since  = citizen?.created_at ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/status"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Status
          </Link>
          <span className="text-gray-200">/</span>
          <Link href="/" className="flex items-center gap-2 text-brand font-bold text-sm no-underline">
            <Image src="/phas-icon.png" alt="PHAS" width={20} height={20} className="rounded-md" />
            PHAS
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt={name} className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0 text-2xl font-bold text-brand">
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-gray-900 truncate">{name}</p>
              <p className="text-sm text-gray-400 mt-0.5 truncate">{email}</p>
              {since && (
                <p className="text-xs text-gray-300 mt-1">
                  Member since <LocalDate date={since} options={{ month: 'long', year: 'numeric' }} />
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-50 flex items-center justify-between gap-4">
            <div className="text-center">
              <p className="text-xl font-extrabold text-gray-900">{reports.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reports</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-red-500">
                {reports.filter(r => r.type === 'affected').length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Issues reported</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-brand">
                {suggestions.length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Suggestions</p>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Report history */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Report history
          </h2>
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="font-semibold text-gray-700 text-sm">No reports yet</p>
              <p className="text-xs text-gray-400 mt-1">Your reports will appear here after you submit them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.platform_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <LocalDate date={r.created_at} options={{ month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.is_anonymous && (
                      <span className="text-xs text-gray-300 font-medium">anon</span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      r.type === 'affected'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      {r.type === 'affected' ? 'Affected' : 'Working'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* My suggestions */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">
            My suggestions
          </h2>
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-2xl mb-2">💡</p>
              <p className="font-semibold text-gray-700 text-sm">No suggestions yet</p>
              <p className="text-xs text-gray-400 mt-1">Your suggestions will appear here after you submit them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map(s => (
                <SuggestionCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ s }: { s: SuggestionRow }) {
  const meta = STATUS_META[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <details className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <summary className="px-4 py-3 flex items-start gap-3 cursor-pointer list-none hover:bg-gray-50/60 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${meta.cls}`}>
              {meta.label}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{s.category}</span>
            {s.upvotes > 0 && (
              <span className="text-xs text-gray-400">↑ {s.upvotes}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{s.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {s.platform_name} ·{' '}
            <LocalDate date={s.created_at} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">{s.body}</p>
        {s.admin_note && (
          <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-violet-600 mb-0.5">Admin note</p>
            <p className="text-sm text-violet-800">{s.admin_note}</p>
          </div>
        )}
        {s.operator_note && (
          <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-teal-600 mb-0.5">Operator response</p>
            <p className="text-sm text-teal-800">{s.operator_note}</p>
          </div>
        )}
      </div>
    </details>
  );
}
