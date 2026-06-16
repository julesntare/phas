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

  const reports: ReportRow[] = citizenId
    ? await sql<ReportRow[]>`
        SELECT p.name AS platform_name, r.type, r.created_at, r.is_anonymous
        FROM reports r
        JOIN platforms p ON p.id = r.platform_id
        WHERE r.reporter_id = ${citizenId}
        ORDER BY r.created_at DESC
        LIMIT 30
      `.catch(() => [])
    : [];

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
              <p className="text-xl font-extrabold text-green-600">
                {reports.filter(r => r.type === 'ok').length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Confirmations</p>
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
      </div>
    </div>
  );
}
