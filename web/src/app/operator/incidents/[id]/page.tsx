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
const STATE_COLOR: Record<string, string> = {
  detected: '#f59e0b', confirmed: '#ef4444', acknowledged: '#f97316',
  partially_resolved: '#a78bfa', recurred: '#dc2626', resolved: '#16a34a',
};
const SOURCE_LABEL: Record<string, string> = {
  crowd: '👥 Citizen reports', probe: '🤖 Automated probe', helpdesk: '🛠 Operator',
};

function timeAgo(dateStr: string): string {
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

  function getToken() {
    return localStorage.getItem('operator_token');
  }

  function loadIncident() {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    fetch(`/api/operator/incidents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) setIncident(data);
        else setError(data.error ?? 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadIncident(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doAction(action: string) {
    if (!note.trim() && action === 'update') return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/operator/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      setNote('');
      setLoading(true);
      loadIncident();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <main style={{ padding: '2rem', color: '#9ca3af' }}>Loading…</main>;
  if (error || !incident) return <main style={{ padding: '2rem', color: '#ef4444' }}>{error || 'Not found'}</main>;

  const color = STATE_COLOR[incident.state] ?? '#6b7280';
  const label = STATE_LABEL[incident.state] ?? incident.state;
  const canAcknowledge = ['detected', 'confirmed', 'recurred'].includes(incident.state);
  const canPartiallyResolve = incident.state === 'acknowledged';
  const canResolve = incident.state !== 'resolved';

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <Link href="/operator/dashboard" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{incident.platform_name}</h1>
          <span style={{
            background: color + '20', color, border: `1px solid ${color}60`,
            borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
          }}>{label}</span>
          {incident.recurrence_count > 0 && (
            <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600 }}>
              Recurrence #{incident.recurrence_count}
            </span>
          )}
        </div>
        <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          {incident.authority_name} · Open {timeAgo(incident.opened_at)} · {incident.cosignCount} co-signs
        </p>
      </div>

      {/* Actions */}
      {canResolve && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>Actions</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (required for 'Post update', optional otherwise)…"
            rows={2}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
          />
          {actionError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.4rem 0' }}>{actionError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => doAction('update')} disabled={actionLoading || !note.trim()} style={actionBtn('#6b7280')}>
              Post update
            </button>
            {canAcknowledge && (
              <button onClick={() => doAction('acknowledge')} disabled={actionLoading} style={actionBtn('#f97316')}>
                Acknowledge
              </button>
            )}
            {canPartiallyResolve && (
              <button onClick={() => doAction('partially_resolve')} disabled={actionLoading} style={actionBtn('#a78bfa')}>
                Partially resolve
              </button>
            )}
            <button onClick={() => doAction('resolve')} disabled={actionLoading} style={actionBtn('#16a34a')}>
              Mark resolved
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Timeline</h2>
        {incident.events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATE_COLOR[ev.to_state] ?? '#9ca3af', marginTop: 6, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>{ev.from_state ? `${STATE_LABEL[ev.from_state] ?? ev.from_state} → ` : ''}{STATE_LABEL[ev.to_state] ?? ev.to_state}</strong>
                <span style={{ color: '#9ca3af', marginLeft: '0.5rem' }}>{SOURCE_LABEL[ev.source] ?? ev.source}</span>
              </p>
              {ev.note && <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#374151' }}>{ev.note}</p>}
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>{timeAgo(ev.at)}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Citizen comments */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Citizen comments ({incident.comments.length})
        </h2>
        {incident.comments.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No comments yet.</p>}
        {incident.comments.map(c => (
          <div key={c.id} style={{ padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{c.content}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
              {c.district ?? 'Unknown district'} · {timeAgo(c.created_at)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: '0.4rem 0.875rem', background: color + '15', color, border: `1px solid ${color}60`,
    borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
  };
}
