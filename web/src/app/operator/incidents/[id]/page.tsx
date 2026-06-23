'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IncidentEvent {
  from_state: string | null; to_state: string; source: string; note: string | null; at: string;
}
interface Comment { id: string; content: string; district: string | null; created_at: string; }
interface Report { id: string; free_text: string | null; proof_image_url: string | null; district: string | null; created_at: string; }
interface Incident {
  id: string; state: string; opened_at: string; closed_at: string | null;
  confidence: number; recurrence_count: number; platform_name: string; authority_name: string;
  cosignCount: number; events: IncidentEvent[]; comments: Comment[]; reports: Report[];
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Detecting', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially Resolved', recurred: 'Recurred', resolved: 'Resolved',
};
const STATE_CLASSES: Record<string, string> = {
  detected:           'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:          'bg-red-50 text-red-700 border-red-200',
  acknowledged:       'bg-orange-50 text-orange-700 border-orange-200',
  partially_resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  recurred:           'bg-red-50 text-red-800 border-red-300',
  resolved:           'bg-green-50 text-green-700 border-green-200',
};
const DOT_COLOR: Record<string, string> = {
  detected: 'bg-amber-400', confirmed: 'bg-red-500', acknowledged: 'bg-orange-500',
  partially_resolved: 'bg-violet-400', recurred: 'bg-red-700', resolved: 'bg-green-500',
};
const SOURCE_LABEL: Record<string, string> = {
  crowd: 'Citizen reports', probe: 'Automated probe', helpdesk: 'Operator',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OperatorIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');

  function getToken() { return localStorage.getItem('operator_token'); }

  function logout() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  function loadIncident() {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    fetch(`/api/operator/incidents/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401) { logout(); return null; } return r.json(); })
      .then(data => { if (!data) return; if (data.id) setIncident(data); else setError(data.error ?? 'Failed to load'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadIncident(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doAction(action: string) {
    if (action === 'update' && !note.trim()) return;
    setActionLoading(true); setActionError('');
    try {
      const res = await fetch(`/api/operator/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      setNote(''); setLoading(true); loadIncident();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !incident) {
    const isNotFound = !incident && (!error || error.toLowerCase().includes('not found'));
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/operator/dashboard"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm w-full">
            <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              {isNotFound ? (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <h1 className="text-lg font-extrabold text-gray-900 mb-1">
              {isNotFound ? 'Incident not found' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {isNotFound
                ? 'This incident may have been removed or the link is invalid.'
                : error}
            </p>
            <Link
              href="/operator/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold no-underline hover:opacity-90 transition-opacity"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canAcknowledge = ['detected', 'confirmed', 'recurred'].includes(incident.state);
  const canPartiallyResolve = incident.state === 'acknowledged';
  const canResolve = incident.state !== 'resolved';
  const sortedEvents = [...incident.events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/operator/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 no-underline transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-semibold text-gray-700 truncate">{incident.platform_name}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{incident.platform_name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {incident.authority_name} · Open {timeAgo(incident.opened_at)} · {incident.cosignCount} co-signs
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {incident.recurrence_count > 0 && (
                <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Recurrence #{incident.recurrence_count}
                </span>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATE_CLASSES[incident.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {STATE_LABEL[incident.state] ?? incident.state}
              </span>
            </div>
          </div>
        </div>

        {/* Share bar */}
        <ShareBar incidentId={id} state={incident.state} platformName={incident.platform_name} />

        {/* Actions */}
        {canResolve && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Actions</h2>
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note (required for 'Post update', optional for other actions)…"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition mb-3"
            />
            {actionError && (
              <p className="text-red-500 text-xs mb-3">{actionError}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <ActionButton label="Post update" color="gray"
                disabled={actionLoading || !note.trim()} onClick={() => doAction('update')} />
              {canAcknowledge && (
                <ActionButton label="Acknowledge" color="orange"
                  disabled={actionLoading} onClick={() => doAction('acknowledge')} />
              )}
              {canPartiallyResolve && (
                <ActionButton label="Partially resolve" color="violet"
                  disabled={actionLoading} onClick={() => doAction('partially_resolve')} />
              )}
              <ActionButton label="Mark resolved" color="green"
                disabled={actionLoading} onClick={() => doAction('resolve')} />
            </div>
          </div>
        )}

        {/* Citizen Reports */}
        {incident.reports.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 mb-4">
              Citizen reports
              <span className="ml-2 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {incident.cosignCount}
              </span>
            </h2>
            <div className="space-y-3">
              {incident.reports.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Report #{i + 1} · {r.district ?? 'Unknown district'}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>
                  {r.free_text && (
                    <p className="text-sm text-gray-800 leading-relaxed">{r.free_text}</p>
                  )}
                  {r.proof_image_url && (
                    <a href={r.proof_image_url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.proof_image_url} alt="Proof"
                        className="rounded-lg max-h-48 object-cover border border-gray-200" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-5">Timeline</h2>
          <div className="space-y-0">
            {sortedEvents.map((ev, i) => (
              <div key={i} className="flex gap-4">
                {/* Dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${DOT_COLOR[ev.to_state] ?? 'bg-gray-300'}`} />
                  {i < sortedEvents.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                </div>
                <div className="pb-5 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">
                      {ev.from_state ? `${STATE_LABEL[ev.from_state] ?? ev.from_state} → ` : ''}
                      {STATE_LABEL[ev.to_state] ?? ev.to_state}
                    </p>
                    <span className="text-xs text-gray-400">{SOURCE_LABEL[ev.source] ?? ev.source}</span>
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(ev.at)}</span>
                  </div>
                  {ev.note && (
                    <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      {ev.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">
            Citizen comments
            <span className="ml-2 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {incident.comments.length}
            </span>
          </h2>
          {incident.comments.length === 0 ? (
            <p className="text-sm text-gray-400">No citizen comments yet.</p>
          ) : (
            <div className="space-y-2">
              {incident.comments.map(c => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-sm text-gray-800">{c.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {c.district ?? 'Unknown district'} · {timeAgo(c.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ACTION_STYLES: Record<string, string> = {
  gray:   'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  green:  'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
};

function ActionButton({ label, color, disabled, onClick }: {
  label: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-xs font-semibold px-3.5 py-2 rounded-lg border transition-colors disabled:opacity-40 ${ACTION_STYLES[color]}`}>
      {label}
    </button>
  );
}

const SHARE_TEXT: Record<string, string> = {
  detected:           '⚠️ {platform} is experiencing issues — citizens are reporting problems.',
  confirmed:          '🚨 {platform} outage confirmed — the issue is affecting multiple users.',
  acknowledged:       '🔧 {platform} issue acknowledged — our team is investigating.',
  partially_resolved: '🔄 {platform} is partially restored — we continue to monitor.',
  recurred:           '⚠️ {platform} is experiencing issues again — we\'re on it.',
  resolved:           '✅ {platform} is back to normal — issue resolved.',
};

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

function ShareBar({ incidentId, state, platformName }: {
  incidentId: string; state: string; platformName: string;
}) {
  const url = `${BASE_URL}/status/incidents/${incidentId}`;
  const template = SHARE_TEXT[state] ?? '⚠️ {platform} is having issues.';
  const text = `${template.replace('{platform}', platformName)}\n\nFollow the incident: ${url}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">Announce on:</span>
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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors no-underline"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Public page
      </a>
    </div>
  );
}
