import Link from 'next/link';
import { notFound } from 'next/navigation';
import sql from '@/lib/db';
import LocalDate from '@/components/LocalDate';
import IncidentActions from './IncidentActions';

export const revalidate = 30;

const STATE_LABEL: Record<string, string> = {
  detected: 'Reported', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially resolved', recurred: 'Recurred', resolved: 'Resolved',
};
const STATE_COLOR: Record<string, string> = {
  detected: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-red-50 text-red-700 border-red-200',
  acknowledged: 'bg-orange-50 text-orange-700 border-orange-200',
  partially_resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  recurred: 'bg-red-50 text-red-800 border-red-300',
  resolved: 'bg-green-50 text-green-700 border-green-200',
};
const EVENT_DOT: Record<string, string> = {
  detected: 'bg-amber-400', confirmed: 'bg-red-500', acknowledged: 'bg-orange-400',
  partially_resolved: 'bg-violet-400', recurred: 'bg-red-700', resolved: 'bg-green-500',
};
const SOURCE_LABEL: Record<string, string> = {
  crowd: 'Citizen reports', probe: 'Automated probe', helpdesk: 'Operator',
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

export default async function PublicIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [incidentRows, eventRows, commentRows, cosignRow] = await Promise.all([
    sql<{
      id: string; state: string; opened_at: string; closed_at: string | null;
      recurrence_count: number; platform_id: string;
      platform_name: string; authority_name: string; platform_avatar: string | null;
    }[]>`
      SELECT i.id, i.state, i.opened_at, i.closed_at, i.recurrence_count,
             i.platform_id,
             p.name AS platform_name, p.avatar_url AS platform_avatar,
             a.name AS authority_name
      FROM incidents i
      JOIN platforms p ON p.id = i.platform_id
      JOIN authorities a ON a.id = p.authority_id
      WHERE i.id = ${id}
    `,
    sql<{ from_state: string | null; to_state: string; source: string; note: string | null; at: string }[]>`
      SELECT from_state, to_state, source, note, at
      FROM incident_events
      WHERE incident_id = ${id}
      ORDER BY at ASC
    `,
    sql<{ id: string; content: string; district: string | null; author_name: string | null; created_at: string }[]>`
      SELECT ic.id, ic.content, ic.district, ic.created_at,
             CASE WHEN ic.citizen_id IS NOT NULL THEN ca.name ELSE NULL END AS author_name
      FROM incident_comments ic
      LEFT JOIN citizen_accounts ca ON ca.id = ic.citizen_id
      WHERE ic.incident_id = ${id}
      ORDER BY ic.created_at ASC
      LIMIT 100
    `,
    sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM reports WHERE incident_id = ${id}
    `,
  ]);

  if (incidentRows.length === 0) notFound();

  const inc = incidentRows[0];
  const cosignCount = Number(cosignRow[0].count);
  const isResolved = inc.state === 'resolved';
  const stateCls = STATE_COLOR[inc.state] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href={`/status/platforms/${inc.platform_id}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {inc.platform_name}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Incident header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start gap-3 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stateCls}`}>
              {STATE_LABEL[inc.state] ?? inc.state}
            </span>
            {inc.recurrence_count > 0 && (
              <span className="text-xs text-red-500 font-semibold px-2.5 py-1">
                Recurrence #{inc.recurrence_count}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <LocalDate date={inc.opened_at} options={DATE_OPTS} />
            {inc.closed_at && (
              <>
                <span>→</span>
                <LocalDate date={inc.closed_at} options={DATE_OPTS} />
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {inc.platform_avatar ? (
              <img src={inc.platform_avatar} alt={inc.platform_name}
                className="w-6 h-6 rounded object-cover border border-gray-100" />
            ) : (
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                {inc.platform_name[0]}
              </div>
            )}
            <span className="text-sm text-gray-600 font-medium">{inc.platform_name}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">{inc.authority_name}</span>
          </div>
        </div>

        {/* Co-sign + comment actions (client island) */}
        <IncidentActions
          incidentId={id}
          cosignCount={cosignCount}
          isResolved={isResolved}
          initialComments={commentRows}
        />

        {/* Timeline */}
        {eventRows.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
              Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
              <div className="space-y-4">
                {eventRows.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 pl-1">
                    <div className={`mt-1 w-3.5 h-3.5 rounded-full shrink-0 border-2 border-white shadow-sm ${EVENT_DOT[ev.to_state] ?? 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {STATE_LABEL[ev.to_state] ?? ev.to_state}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          via {SOURCE_LABEL[ev.source] ?? ev.source}
                        </span>
                      </p>
                      {ev.note && (
                        <p className="text-sm text-gray-500 mt-0.5">{ev.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        <LocalDate date={ev.at} options={DATE_OPTS} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
