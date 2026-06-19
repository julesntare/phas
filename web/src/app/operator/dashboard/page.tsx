'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Incident {
  id: string; state: string; opened_at: string;
  confidence: number; recurrence_count: number;
  platform_name: string; cosign_count: string; comment_count: string;
}
interface MaintenanceWindow {
  id: string; title: string; description: string | null;
  starts_at: string; ends_at: string; created_at: string;
}
interface ResolvedIncident {
  id: string; opened_at: string; closed_at: string;
  recurrence_count: number; duration_hours: number; event_count: number;
}
interface HealthData {
  uptime: { d7: number | null; d30: number | null; d90: number | null };
  probe24h: { hour: string; ok_count: number; total: number }[];
  reports7d: { day: string; count: number }[];
  incidents: { resolved: number; active: number };
}
interface Profile {
  id: string; name: string | null; email: string; avatarUrl: string | null;
  platform: { id: string; name: string; category: string; base_url: string; authority_name: string };
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Detecting', confirmed: 'Confirmed', acknowledged: 'Acknowledged',
  partially_resolved: 'Partially Resolved', recurred: 'Recurred',
};
const STATE_CLASSES: Record<string, string> = {
  detected:           'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:          'bg-red-50 text-red-700 border-red-200',
  acknowledged:       'bg-orange-50 text-orange-700 border-orange-200',
  partially_resolved: 'bg-violet-50 text-violet-700 border-violet-200',
  recurred:           'bg-red-50 text-red-800 border-red-300',
};
const ROW_CLASSES: Record<string, string> = {
  detected:           'border-amber-100 bg-amber-50/40',
  confirmed:          'border-red-100 bg-red-50/40',
  acknowledged:       'border-orange-100 bg-orange-50/40',
  partially_resolved: 'border-violet-100 bg-violet-50/40',
  recurred:           'border-red-200 bg-red-50/60',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Tab = 'incidents' | 'history' | 'health' | 'maintenance' | 'profile';

export default function OperatorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('incidents');
  const [operatorName, setOperatorName] = useState('');

  // Incidents
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incLoading, setIncLoading] = useState(true);
  const [incError, setIncError] = useState('');

  // History
  const [history, setHistory] = useState<ResolvedIncident[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthLoaded, setHealthLoaded] = useState(false);

  // Maintenance
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [mwLoading, setMwLoading] = useState(false);
  const [mwError, setMwError] = useState('');
  const [mwTitle, setMwTitle] = useState('');
  const [mwDesc, setMwDesc] = useState('');
  const [mwStart, setMwStart] = useState('');
  const [mwEnd, setMwEnd] = useState('');
  const [mwSaving, setMwSaving] = useState(false);

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profLoading, setProfLoading] = useState(false);
  const [profLoaded, setProfLoaded] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  function getToken() { return localStorage.getItem('operator_token'); }

  function logout() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    const info = localStorage.getItem('operator_info');
    if (info) setOperatorName(JSON.parse(info).name ?? JSON.parse(info).email);
    fetch('/api/operator/incidents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401) { logout(); return null; } return r.json(); })
      .then(d => { if (!d) return; if (Array.isArray(d)) setIncidents(d); else setIncError(d.error ?? 'Failed'); })
      .catch(() => setIncError('Network error'))
      .finally(() => setIncLoading(false));
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = useCallback(() => {
    if (histLoaded) return;
    setHistLoading(true);
    fetch('/api/operator/history', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setHistory(d); setHistLoaded(true); } })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [histLoaded]);

  const loadHealth = useCallback(() => {
    if (healthLoaded) return;
    setHealthLoading(true);
    fetch('/api/operator/health', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.uptime) { setHealth(d); setHealthLoaded(true); } })
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, [healthLoaded]);

  const loadProfile = useCallback(() => {
    if (profLoaded) return;
    setProfLoading(true);
    fetch('/api/operator/profile', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.email) { setProfile(d); setEditName(d.name ?? ''); setProfLoaded(true); } })
      .catch(() => {})
      .finally(() => setProfLoading(false));
  }, [profLoaded]);

  async function uploadAvatar(file: File) {
    setAvatarUploading(true); setAvatarError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/operator/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setProfile(p => p ? { ...p, avatarUrl: data.url } : p);
    } catch (e: unknown) {
      setAvatarError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setAvatarUploading(false); }
  }

  function loadMaintenance() {
    setMwLoading(true); setMwError('');
    fetch('/api/operator/maintenance', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setWindows(d); else setMwError(d.error ?? 'Failed'); })
      .catch(() => setMwError('Network error'))
      .finally(() => setMwLoading(false));
  }

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'health') loadHealth();
    if (tab === 'profile') loadProfile();
    if (tab === 'maintenance') loadMaintenance();
  }, [tab, loadHistory, loadHealth, loadProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createWindow() {
    if (!mwTitle || !mwStart || !mwEnd) return;
    setMwSaving(true); setMwError('');
    try {
      // datetime-local gives local time without TZ — convert to UTC before sending
      const starts_at = new Date(mwStart).toISOString();
      const ends_at   = new Date(mwEnd).toISOString();
      const res = await fetch('/api/operator/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: mwTitle, description: mwDesc || undefined, starts_at, ends_at }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMwTitle(''); setMwDesc(''); setMwStart(''); setMwEnd('');
      loadMaintenance();
    } catch (e: unknown) {
      setMwError(e instanceof Error ? e.message : 'Failed to save');
    } finally { setMwSaving(false); }
  }

  async function cancelWindow(id: string) {
    await fetch(`/api/operator/maintenance/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    loadMaintenance();
  }

  async function saveName() {
    if (!editName.trim()) return;
    setNameSaving(true);
    await fetch('/api/operator/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name: editName }),
    });
    setOperatorName(editName);
    setProfile(p => p ? { ...p, name: editName } : p);
    const info = localStorage.getItem('operator_info');
    if (info) {
      const parsed = JSON.parse(info);
      localStorage.setItem('operator_info', JSON.stringify({ ...parsed, name: editName }));
    }
    setEditingName(false);
    setNameSaving(false);
  }

  async function changePassword() {
    setPwError(''); setPwSuccess(false);
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Must be at least 8 characters'); return; }
    setPwSaving(true);
    const res = await fetch('/api/operator/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    });
    const data = await res.json();
    if (!res.ok) { setPwError(data.error ?? 'Failed'); }
    else { setPwSuccess(true); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    setPwSaving(false);
  }

  function signOut() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'incidents',    label: 'Incidents',    badge: incidents.length || undefined },
    { key: 'history',      label: 'History' },
    { key: 'health',       label: 'Health' },
    { key: 'maintenance',  label: 'Maintenance' },
    { key: 'profile',      label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/phas-icon.png" alt="PHAS" width={28} height={28} className="rounded-lg" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Platform Portal</p>
              {operatorName && <p className="text-xs text-gray-400 leading-none mt-0.5">{operatorName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile?.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
            )}
            <button onClick={signOut}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 shadow-sm overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                tab === t.key ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Incidents tab ───────────────────────────────────────────────── */}
        {tab === 'incidents' && (
          <>
            {incLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {incError && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">{incError}</div>
            )}
            {!incLoading && !incError && incidents.length === 0 && (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">All clear</p>
                <p className="text-sm text-gray-400 mt-1">No active incidents on your platform.</p>
              </div>
            )}
            <div className="space-y-2">
              {incidents.map(inc => (
                <Link key={inc.id} href={`/operator/incidents/${inc.id}`}
                  className={`block rounded-xl border px-4 py-4 hover:shadow-sm transition-shadow no-underline ${ROW_CLASSES[inc.state] ?? 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{inc.platform_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Opened {timeAgo(inc.opened_at)}
                        {' · '}{inc.cosign_count} co-signs · {inc.comment_count} comments
                        {Number(inc.recurrence_count) > 0 && ` · Recurrence #${inc.recurrence_count}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${STATE_CLASSES[inc.state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {STATE_LABEL[inc.state] ?? inc.state}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── History tab ─────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {histLoading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!histLoading && history.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-16">No resolved incidents yet.</p>
            )}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-700">
                    Resolved incidents <span className="text-gray-400 font-normal">({history.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {history.map(inc => (
                    <div key={inc.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 font-medium">
                          {formatDate(inc.opened_at)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {inc.event_count} events
                          {inc.recurrence_count > 0 && ` · Recurrence #${inc.recurrence_count}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">
                            {formatDuration(inc.duration_hours)}
                          </p>
                          <p className="text-xs text-gray-400">duration</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                          Resolved
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Health tab ──────────────────────────────────────────────────── */}
        {tab === 'health' && (
          <>
            {healthLoading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {health && (
              <div className="space-y-5">
                {/* Uptime cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: '7-day uptime', value: health.uptime.d7 },
                    { label: '30-day uptime', value: health.uptime.d30 },
                    { label: '90-day uptime', value: health.uptime.d90 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                      <p className={`text-3xl font-extrabold ${
                        value == null ? 'text-gray-300'
                        : value >= 99 ? 'text-green-600'
                        : value >= 95 ? 'text-orange-500'
                        : 'text-red-500'
                      }`}>
                        {value != null ? `${value}%` : '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                {/* 24h probe grid */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Last 24 hours — probe results</h2>
                  {health.probe24h.length === 0 ? (
                    <p className="text-xs text-gray-400">No probe data in last 24 hours.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {health.probe24h.map(b => {
                        const pct = b.total > 0 ? b.ok_count / b.total : 1;
                        const color = pct >= 0.98 ? 'bg-green-400' : pct >= 0.8 ? 'bg-amber-400' : 'bg-red-500';
                        const hour = new Date(b.hour).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={b.hour} title={`${hour} — ${b.ok_count}/${b.total} ok`}
                            className={`w-5 h-5 rounded ${color} opacity-90 hover:opacity-100 transition-opacity cursor-default`} />
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {[['bg-green-400','≥98% ok'],['bg-amber-400','80–98%'],['bg-red-500','<80%']].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded ${c}`} />
                        <span className="text-xs text-gray-400">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citizen reports bar chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Citizen reports — last 7 days</h2>
                  {health.reports7d.length === 0 ? (
                    <p className="text-xs text-gray-400">No citizen reports this week.</p>
                  ) : (() => {
                    const max = Math.max(...health.reports7d.map(r => r.count), 1);
                    return (
                      <div className="space-y-2">
                        {health.reports7d.map(r => (
                          <div key={r.day} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-16 shrink-0">
                              {new Date(r.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-brand rounded-full transition-all"
                                style={{ width: `${(r.count / max) * 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-4 text-right">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Incident summary */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-3">Incident summary — all time</h2>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-2xl font-extrabold text-green-600">{health.incidents.resolved}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Resolved</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold ${health.incidents.active > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {health.incidents.active}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Maintenance tab ─────────────────────────────────────────────── */}
        {tab === 'maintenance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Schedule maintenance</h2>
              <div className="space-y-3">
                <input value={mwTitle} onChange={e => setMwTitle(e.target.value)}
                  placeholder="Maintenance title (e.g. Database upgrade)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                <textarea value={mwDesc} onChange={e => setMwDesc(e.target.value)}
                  placeholder="Description (optional)" rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Starts at</label>
                    <input type="datetime-local" value={mwStart} onChange={e => setMwStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ends at</label>
                    <input type="datetime-local" value={mwEnd} onChange={e => setMwEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                  </div>
                </div>
                {mwError && <p className="text-red-500 text-xs">{mwError}</p>}
                <button onClick={createWindow} disabled={mwSaving || !mwTitle || !mwStart || !mwEnd}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                  {mwSaving ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Upcoming &amp; active</h2>
              {mwLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!mwLoading && windows.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No scheduled maintenance.</p>
              )}
              <div className="space-y-2">
                {windows.map(w => {
                  const now = new Date();
                  const active = new Date(w.starts_at) <= now && new Date(w.ends_at) > now;
                  return (
                    <div key={w.id}
                      className={`rounded-xl border px-4 py-3.5 flex items-start justify-between gap-4 ${active ? 'bg-blue-50/60 border-blue-100' : 'bg-white border-gray-100'}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{w.title}</p>
                          {active && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Active</span>}
                        </div>
                        {w.description && <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(w.starts_at)} → {formatDateTime(w.ends_at)}
                        </p>
                      </div>
                      <button onClick={() => cancelWindow(w.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0 transition-colors">
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Profile tab ─────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <>
            {profLoading && (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {profile && (
              <div className="space-y-5">
                {/* Identity card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-5">Account</h2>
                  <div className="space-y-4">
                    {/* Avatar */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Logo / Avatar</label>
                      <div className="flex items-center gap-4">
                        {profile.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.avatarUrl} alt="avatar" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl text-gray-400">
                            {(profile.name ?? profile.email)[0]?.toUpperCase()}
                          </div>
                        )}
                        <label className={`cursor-pointer px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {avatarUploading ? 'Uploading…' : 'Change'}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
                        </label>
                      </div>
                      {avatarError && <p className="text-xs text-red-600 mt-1.5">{avatarError}</p>}
                    </div>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display name</label>
                      {editingName ? (
                        <div className="flex gap-2">
                          <input value={editName} onChange={e => setEditName(e.target.value)}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                          <button onClick={saveName} disabled={nameSaving}
                            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors">
                            {nameSaving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => { setEditingName(false); setEditName(profile.name ?? ''); }}
                            className="px-4 py-2 text-gray-500 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-800">{profile.name ?? <span className="text-gray-400 italic">Not set</span>}</p>
                          <button onClick={() => setEditingName(true)}
                            className="text-xs text-brand font-semibold hover:text-brand-dark transition-colors">
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                    </div>
                  </div>
                </div>

                {/* Platform card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Platform</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Name</span>
                      <span className="text-sm font-semibold text-gray-800">{profile.platform.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Authority</span>
                      <span className="text-sm text-gray-700">{profile.platform.authority_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Category</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {profile.platform.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">URL</span>
                      <a href={profile.platform.base_url} target="_blank" rel="noreferrer"
                        className="text-xs text-brand hover:text-brand-dark truncate max-w-45">
                        {profile.platform.base_url}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Change password */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-5">Change password</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Current password', value: currentPw, setter: setCurrentPw },
                      { label: 'New password',     value: newPw,     setter: setNewPw },
                      { label: 'Confirm new',      value: confirmPw, setter: setConfirmPw },
                    ].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
                        <input type="password" value={value} onChange={e => setter(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                      </div>
                    ))}
                    {pwError && <p className="text-xs text-red-600">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-green-600">Password updated successfully.</p>}
                    <button onClick={changePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                      className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                      {pwSaving ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
