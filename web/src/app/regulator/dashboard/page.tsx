'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Summary {
  total_platforms: string;
  platforms_with_issues: string;
  active_incidents: string;
  resolved_this_week: string;
}
interface AuthorityStat {
  authority_id: string; authority_name: string;
  total_platforms: string; active_incidents: string; avg_resolve_hours: string | null;
}
interface ActiveIncident {
  id: string; state: string; opened_at: string;
  platform_name: string; authority_name: string; cosign_count: string;
}
interface ResolvedIncident {
  id: string; opened_at: string; closed_at: string;
  platform_name: string; authority_name: string;
}
interface Stats {
  summary: Summary;
  byAuthority: AuthorityStat[];
  activeIncidents: ActiveIncident[];
  recentResolved: ResolvedIncident[];
}

const STATE_COLOR: Record<string, string> = {
  detected: '#f59e0b', confirmed: '#ef4444', acknowledged: '#f97316',
  partially_resolved: '#a78bfa', recurred: '#dc2626',
};
const STATE_LABEL: Record<string, string> = {
  detected: 'Detecting', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially resolved', recurred: 'Recurred',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function duration(from: string, to: string) {
  const mins = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

export default function RegulatorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regulatorName, setRegulatorName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('regulator_token');
    if (!token) { router.replace('/regulator'); return; }
    const info = localStorage.getItem('regulator_info');
    if (info) setRegulatorName(JSON.parse(info).name ?? JSON.parse(info).email);

    fetch('/api/regulator/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.summary) setStats(data);
        else setError(data.error ?? 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    localStorage.removeItem('regulator_token');
    localStorage.removeItem('regulator_info');
    router.replace('/regulator');
  }

  if (loading) return <main style={{ padding: '2rem', color: '#9ca3af' }}>Loading…</main>;
  if (error || !stats) return <main style={{ padding: '2rem', color: '#ef4444' }}>{error || 'No data'}</main>;

  const { summary, byAuthority, activeIncidents, recentResolved } = stats;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>System Overview</h1>
          {regulatorName && <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{regulatorName}</p>}
        </div>
        <button onClick={signOut} style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', padding: '0.3rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Platforms', value: summary.total_platforms, color: '#0055A4' },
          { label: 'With issues', value: summary.platforms_with_issues, color: '#ef4444' },
          { label: 'Active incidents', value: summary.active_incidents, color: '#f97316' },
          { label: 'Resolved this week', value: summary.resolved_this_week, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff' }}>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color }}>{value}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Active incidents */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Active incidents ({activeIncidents.length})
          </h2>
          {activeIncidents.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>None — all clear.</p>}
          {activeIncidents.map(inc => {
            const color = STATE_COLOR[inc.state] ?? '#6b7280';
            return (
              <div key={inc.id} style={{ padding: '0.75rem', border: `1px solid ${color}30`, background: `${color}08`, borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{inc.platform_name}</p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      {inc.authority_name} · open {timeAgo(inc.opened_at)} · {inc.cosign_count} co-signs
                    </p>
                  </div>
                  <span style={{ background: color + '20', color, border: `1px solid ${color}50`, borderRadius: '9999px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {STATE_LABEL[inc.state] ?? inc.state}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* By authority */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>By authority</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem 0.3rem 0', fontWeight: 500 }}>Authority</th>
                <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', fontWeight: 500 }}>Platforms</th>
                <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', fontWeight: 500 }}>Active</th>
                <th style={{ textAlign: 'right', padding: '0.3rem 0 0.3rem 0.5rem', fontWeight: 500 }}>Avg resolve</th>
              </tr>
            </thead>
            <tbody>
              {byAuthority.map(a => (
                <tr key={a.authority_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', fontWeight: 500 }}>{a.authority_name}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280' }}>{a.total_platforms}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                    {Number(a.active_incidents) > 0
                      ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{a.active_incidents}</span>
                      : <span style={{ color: '#16a34a' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0 0.5rem 0.5rem', color: '#6b7280' }}>
                    {a.avg_resolve_hours ? `${a.avg_resolve_hours}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Recently resolved */}
      {recentResolved.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Resolved this week</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {recentResolved.map(inc => (
              <div key={inc.id} style={{ padding: '0.75rem', border: '1px solid #d1fae5', background: '#f0fdf4', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{inc.platform_name}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{inc.authority_name}</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                  {duration(inc.opened_at, inc.closed_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
