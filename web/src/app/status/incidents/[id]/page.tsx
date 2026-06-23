import Link from 'next/link';
import { notFound } from 'next/navigation';
import sql from '@/lib/db';
import LocalDate from '@/components/LocalDate';
import IncidentActions from './IncidentActions';

export const revalidate = 30;

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

const SHARE_TEXT: Record<string, string> = {
  detected:           '⚠️ {platform} is experiencing issues — others are reporting problems.',
  confirmed:          '🚨 {platform} outage confirmed — the issue is affecting multiple users.',
  acknowledged:       '🔧 {platform} issue is being investigated by the operator.',
  partially_resolved: '🔄 {platform} is partially restored — monitoring continues.',
  recurred:           '⚠️ {platform} is experiencing issues again.',
  resolved:           '✅ {platform} is back to normal — issue resolved.',
};

function buildShareText(state: string, platformName: string, incidentUrl: string) {
  const template = SHARE_TEXT[state] ?? '⚠️ {platform} is having issues.';
  const text = template.replace('{platform}', platformName);
  return `${text}\n\nFollow the incident and report if you're affected: ${incidentUrl}`;
}

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

        {/* Share bar */}
        <ShareBar incidentId={id} state={inc.state} platformName={inc.platform_name} />

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

function ShareBar({ incidentId, state, platformName }: {
  incidentId: string; state: string; platformName: string;
}) {
  const url = `${BASE_URL}/status/incidents/${incidentId}`;
  const text = buildShareText(state, platformName, url);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 mr-1">Share:</span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors no-underline"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Post on X
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#25D366] text-white hover:bg-[#1ebe5d] transition-colors no-underline"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        WhatsApp
      </a>
    </div>
  );
}
