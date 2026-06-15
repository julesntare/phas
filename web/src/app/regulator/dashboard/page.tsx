'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Summary {
  total_platforms: string; platforms_with_issues: string;
  active_incidents: string; resolved_this_week: string;
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
interface SLABreach {
  id: string; state: string; opened_at: string; hours_open: string;
  platform_name: string; authority_name: string; breach_type: string;
}
interface Stats {
  summary: Summary; byAuthority: AuthorityStat[];
  activeIncidents: ActiveIncident[]; recentResolved: ResolvedIncident[];
  slaBreaches: SLABreach[];
}

interface PlatformStat {
  platform_id: string; platform_name: string; category: string;
  authority_id: string; authority_name: string;
  uptime_7d: number | null; active_incidents: number;
  resolved_30d: number; avg_resolve_hours_30d: string | null;
}

interface TrendData {
  weekly: { week_start: string; opened: number; resolved: number }[];
  byAuthority: { authority_name: string; total_incidents: number; resolved_count: number; avg_resolve_hours: number | null }[];
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Detecting', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially resolved', recurred: 'Recurred',
};
const STATE_CLASSES: Record<string, string> = {
  detected:           'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:          'bg-red-50 text-red-700 border-red-200',
  acknowledged:       'bg-orange-50 text-orange-700 border-orange-200',
  partially_resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  recurred:           'bg-red-50 text-red-800 border-red-300',
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

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const days = h / 24;
  if (days < 7) {
    const d = Math.floor(days);
    const rem = Math.round(h - d * 24);
    return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
  }
  const weeks = days / 7;
  if (weeks < 4) {
    const w = Math.floor(weeks);
    const rem = Math.floor(days - w * 7);
    return rem > 0 ? `${w}w ${rem}d` : `${w}w`;
  }
  const mo = Math.floor(days / 30);
  const rem = Math.floor((days - mo * 30) / 7);
  return rem > 0 ? `${mo}mo ${rem}w` : `${mo}mo`;
}

type Tab = 'overview' | 'platforms' | 'trend';

export default function RegulatorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regulatorName, setRegulatorName] = useState('');

  // Platforms tab
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
  const [platLoading, setPlatLoading] = useState(false);
  const [platLoaded, setPlatLoaded] = useState(false);

  // Trend tab
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendLoaded, setTrendLoaded] = useState(false);

  function getToken() { return localStorage.getItem('regulator_token'); }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/regulator'); return; }
    const info = localStorage.getItem('regulator_info');
    if (info) setRegulatorName(JSON.parse(info).name ?? JSON.parse(info).email);
    fetch('/api/regulator/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.summary) setStats(data); else setError(data.error ?? 'Failed to load'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [router]);

  const loadPlatforms = useCallback(() => {
    if (platLoaded) return;
    setPlatLoading(true);
    fetch('/api/regulator/platforms', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setPlatforms(d); setPlatLoaded(true); } })
      .catch(() => {})
      .finally(() => setPlatLoading(false));
  }, [platLoaded]);

  const loadTrend = useCallback(() => {
    if (trendLoaded) return;
    setTrendLoading(true);
    fetch('/api/regulator/trend', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.weekly) { setTrend(d); setTrendLoaded(true); } })
      .catch(() => {})
      .finally(() => setTrendLoading(false));
  }, [trendLoaded]);

  useEffect(() => {
    if (tab === 'platforms') loadPlatforms();
    if (tab === 'trend') loadTrend();
  }, [tab, loadPlatforms, loadTrend]);

  function signOut() {
    localStorage.removeItem('regulator_token');
    localStorage.removeItem('regulator_info');
    router.replace('/regulator');
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !stats) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error || 'No data'}</p>
    </div>
  );

  const { summary, byAuthority, activeIncidents, recentResolved, slaBreaches } = stats;

  // Group platforms by authority for display
  const platByAuthority: Record<string, PlatformStat[]> = {};
  for (const p of platforms) {
    (platByAuthority[p.authority_name] ??= []).push(p);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'platforms', label: 'Platforms' },
    { key: 'trend',     label: 'Trend' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/phas-icon.png" alt="PHAS" width={28} height={28} className="rounded-lg" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Regulator Portal</p>
              {regulatorName && <p className="text-xs text-gray-400 leading-none mt-0.5">{regulatorName}</p>}
            </div>
          </div>
          <button onClick={signOut}
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-8 bg-white border border-gray-100 rounded-xl p-1 shadow-sm w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Platforms',          value: summary.total_platforms,       icon: '🏛',  accent: 'text-brand',    bg: 'bg-blue-50'   },
                { label: 'With issues',        value: summary.platforms_with_issues, icon: '⚠️', accent: 'text-red-600',   bg: 'bg-red-50'    },
                { label: 'Active incidents',   value: summary.active_incidents,      icon: '🔴', accent: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Resolved this week', value: summary.resolved_this_week,    icon: '✅', accent: 'text-green-700', bg: 'bg-green-50'  },
              ].map(({ label, value, icon, accent, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-lg mb-3`}>
                    {icon}
                  </div>
                  <p className={`text-3xl font-extrabold ${accent}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* SLA alerts */}
            {slaBreaches.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">SLA violations — {slaBreaches.length} incident{slaBreaches.length > 1 ? 's' : ''}</p>
                    <p className="text-xs text-red-500 mt-0.5">Unacknowledged &gt;4h or unresolved &gt;24h</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {slaBreaches.map(b => (
                    <div key={b.id} className="bg-white rounded-xl border border-red-100 px-4 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{b.platform_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{b.authority_name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATE_CLASSES[b.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {STATE_LABEL[b.state] ?? b.state}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{formatHours(Number(b.hours_open))}</p>
                          <p className="text-xs text-gray-400">
                            {b.breach_type === 'unacknowledged' ? 'Not acknowledged' : 'Not resolved'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Active incidents */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-700">Active incidents</h2>
                  <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                    {activeIncidents.length}
                  </span>
                </div>
                {activeIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-sm text-gray-400">All clear</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeIncidents.map(inc => (
                      <div key={inc.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{inc.platform_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {inc.authority_name} · {timeAgo(inc.opened_at)} · {inc.cosign_count} co-signs
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATE_CLASSES[inc.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {STATE_LABEL[inc.state] ?? inc.state}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By authority */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-4">By authority</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left pb-2 pr-4">Authority</th>
                      <th className="text-center pb-2 px-2">Platforms</th>
                      <th className="text-center pb-2 px-2">Active</th>
                      <th className="text-right pb-2">Avg resolve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byAuthority.map(a => (
                      <tr key={a.authority_id} className="text-xs">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{a.authority_name}</td>
                        <td className="py-2.5 px-2 text-center text-gray-500">{a.total_platforms}</td>
                        <td className="py-2.5 px-2 text-center">
                          {Number(a.active_incidents) > 0
                            ? <span className="text-red-600 font-bold">{a.active_incidents}</span>
                            : <span className="text-green-500">—</span>}
                        </td>
                        <td className="py-2.5 text-right text-gray-400">
                          {a.avg_resolve_hours ? formatHours(Number(a.avg_resolve_hours)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resolved this week */}
            {recentResolved.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-4">Resolved this week</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recentResolved.map(inc => (
                    <div key={inc.id} className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{inc.platform_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{inc.authority_name}</p>
                      </div>
                      <span className="text-xs font-bold text-green-700 shrink-0">
                        {duration(inc.opened_at, inc.closed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Platforms tab ────────────────────────────────────────────────── */}
        {tab === 'platforms' && (
          <>
            {platLoading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!platLoading && platforms.length === 0 && platLoaded && (
              <p className="text-center text-gray-400 py-16">No platforms found.</p>
            )}
            {platforms.length > 0 && (
              <div className="space-y-8">
                {Object.entries(platByAuthority).map(([authority, plist]) => (
                  <div key={authority}>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{authority}</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                            <th className="text-left px-5 py-3">Platform</th>
                            <th className="text-center px-3 py-3">Category</th>
                            <th className="text-center px-3 py-3">7d uptime</th>
                            <th className="text-center px-3 py-3">Active</th>
                            <th className="text-center px-3 py-3">Resolved 30d</th>
                            <th className="text-right px-5 py-3">Avg resolve</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {plist.map(p => (
                            <tr key={p.platform_id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-5 py-3 font-medium text-gray-800">{p.platform_name}</td>
                              <td className="px-3 py-3 text-center">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                                  {p.category}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {p.uptime_7d != null ? (
                                  <span className={`text-sm font-bold ${
                                    p.uptime_7d >= 99 ? 'text-green-600'
                                    : p.uptime_7d >= 95 ? 'text-amber-500'
                                    : 'text-red-500'
                                  }`}>
                                    {p.uptime_7d}%
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {p.active_incidents > 0
                                  ? <span className="text-red-600 font-bold text-sm">{p.active_incidents}</span>
                                  : <span className="text-green-500 text-sm">—</span>}
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500 text-sm">{p.resolved_30d}</td>
                              <td className="px-5 py-3 text-right text-gray-400 text-sm">
                                {p.avg_resolve_hours_30d != null ? formatHours(Number(p.avg_resolve_hours_30d)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Trend tab ────────────────────────────────────────────────────── */}
        {tab === 'trend' && (
          <>
            {trendLoading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {trend && (
              <div className="space-y-8">
                {/* Weekly bar chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-6">Weekly incidents — last 13 weeks</h2>
                  {trend.weekly.length === 0 ? (
                    <p className="text-sm text-gray-400">No data yet.</p>
                  ) : (() => {
                    const maxOpened = Math.max(...trend.weekly.map(w => w.opened), 1);
                    return (
                      <div className="space-y-3">
                        {trend.weekly.map(w => {
                          const weekLabel = new Date(w.week_start).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' });
                          const openedPct = (w.opened / maxOpened) * 100;
                          const resolvedPct = w.opened > 0 ? (w.resolved / w.opened) * 100 : 0;
                          return (
                            <div key={w.week_start} className="flex items-center gap-4">
                              <span className="text-xs text-gray-500 w-16 shrink-0">{weekLabel}</span>
                              <div className="flex-1 relative h-6">
                                {/* Opened bar */}
                                <div className="absolute inset-y-0 left-0 bg-red-100 rounded-full transition-all"
                                  style={{ width: `${openedPct}%` }} />
                                {/* Resolved overlay */}
                                <div className="absolute inset-y-0 left-0 bg-green-400 rounded-full transition-all opacity-80"
                                  style={{ width: `${openedPct * resolvedPct / 100}%` }} />
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-xs">
                                <span className="text-red-600 font-bold w-4 text-right">{w.opened}</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-green-600 font-semibold w-4">{w.resolved}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50">
                          {[['bg-red-200','Opened'],['bg-green-400 opacity-80','Resolved']].map(([cls, lbl]) => (
                            <div key={lbl} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${cls}`} />
                              <span className="text-xs text-gray-400">{lbl}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* By authority summary */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="text-sm font-bold text-gray-700">By authority — 90-day window</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Authority</th>
                        <th className="text-center px-4 py-3">Total</th>
                        <th className="text-center px-4 py-3">Resolved</th>
                        <th className="text-center px-4 py-3">Resolution rate</th>
                        <th className="text-right px-6 py-3">Avg resolve time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {trend.byAuthority.map(a => {
                        const rate = a.total_incidents > 0
                          ? Math.round((a.resolved_count / a.total_incidents) * 100) : 100;
                        return (
                          <tr key={a.authority_name} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-6 py-3 font-semibold text-gray-800">{a.authority_name}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{a.total_incidents}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{a.resolved_count}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                    style={{ width: `${rate}%` }} />
                                </div>
                                <span className={`text-xs font-semibold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {rate}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right text-gray-400">
                              {a.avg_resolve_hours != null ? formatHours(a.avg_resolve_hours) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
