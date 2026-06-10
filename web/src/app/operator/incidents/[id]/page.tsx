'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IncidentEvent {
  from_state: string | null; to_state: string; source: string; note: string | null; at: string;
}
interface Comment { id: string; content: string; district: string | null; created_at: string; }
interface Incident {
  id: string; state: string; opened_at: string; closed_at: string | null;
  confidence: number; recurrence_count: number; platform_name: string; authority_name: string;
  cosignCount: number; events: IncidentEvent[]; comments: Comment[];
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

  function loadIncident() {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    fetch(`/api/operator/incidents/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.id) setIncident(data); else setError(data.error ?? 'Failed to load'); })
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
  if (error || !incident) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error || 'Not found'}</p>
    </div>
  );

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
