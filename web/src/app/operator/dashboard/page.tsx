'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Incident {
  id: string; state: string; opened_at: string;
  confidence: number; recurrence_count: number;
  platform_name: string; cosign_count: string; comment_count: string;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Detecting', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially Resolved', recurred: 'Recurred',
};
const STATE_COLOR: Record<string, string> = {
  detected: '#f59e0b', confirmed: '#ef4444', acknowledged: '#f97316',
  partially_resolved: '#a78bfa', recurred: '#dc2626',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OperatorDashboard() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operatorName, setOperatorName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('operator_token');
    if (!token) { router.replace('/operator'); return; }
    const info = localStorage.getItem('operator_info');
    if (info) setOperatorName(JSON.parse(info).name ?? JSON.parse(info).email);

    fetch('/api/operator/incidents', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setIncidents(data);
        else setError(data.error ?? 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Active Incidents</h1>
          {operatorName && <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{operatorName}</p>}
        </div>
        <button onClick={signOut} style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', padding: '0.3rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      {!loading && !error && incidents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1.25rem' }}>✅</p>
          <p>No active incidents — all platforms are operational.</p>
        </div>
      )}

      {incidents.map(inc => {
        const color = STATE_COLOR[inc.state] ?? '#6b7280';
        const label = STATE_LABEL[inc.state] ?? inc.state;
        return (
          <Link key={inc.id} href={`/operator/incidents/${inc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem', marginBottom: '0.5rem', borderRadius: '0.5rem',
              border: `1px solid ${color}40`, background: `${color}08`, cursor: 'pointer',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{inc.platform_name}</p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  Opened {timeAgo(inc.opened_at)} · {inc.cosign_count} co-signs · {inc.comment_count} comments
                  {Number(inc.recurrence_count) > 0 && ` · Recurrence #${inc.recurrence_count}`}
                </p>
              </div>
              <span style={{
                background: color + '20', color, border: `1px solid ${color}60`,
                borderRadius: '9999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
          </Link>
        );
      })}
    </main>
  );
}
