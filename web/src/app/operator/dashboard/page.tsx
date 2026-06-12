'use client';

import { useEffect, useState } from 'react';
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

type Tab = 'incidents' | 'maintenance';

export default function OperatorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operatorName, setOperatorName] = useState('');

  // Maintenance state
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [mwLoading, setMwLoading] = useState(false);
  const [mwError, setMwError] = useState('');
  const [mwTitle, setMwTitle] = useState('');
  const [mwDesc, setMwDesc] = useState('');
  const [mwStart, setMwStart] = useState('');
  const [mwEnd, setMwEnd] = useState('');
  const [mwSaving, setMwSaving] = useState(false);

  function getToken() { return localStorage.getItem('operator_token'); }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    const info = localStorage.getItem('operator_info');
    if (info) setOperatorName(JSON.parse(info).name ?? JSON.parse(info).email);
    fetch('/api/operator/incidents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setIncidents(data); else setError(data.error ?? 'Failed to load'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [router]);

  function loadMaintenance() {
    const token = getToken();
    if (!token) return;
    setMwLoading(true); setMwError('');
    fetch('/api/operator/maintenance', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setWindows(data); else setMwError(data.error ?? 'Failed'); })
      .catch(() => setMwError('Network error'))
      .finally(() => setMwLoading(false));
  }

  useEffect(() => { if (tab === 'maintenance') loadMaintenance(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createWindow() {
    if (!mwTitle || !mwStart || !mwEnd) return;
    setMwSaving(true); setMwError('');
    try {
      const res = await fetch('/api/operator/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: mwTitle, description: mwDesc || undefined, starts_at: mwStart, ends_at: mwEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMwTitle(''); setMwDesc(''); setMwStart(''); setMwEnd('');
      loadMaintenance();
    } catch (e: unknown) {
      setMwError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setMwSaving(false);
    }
  }

  async function cancelWindow(id: string) {
    const res = await fetch(`/api/operator/maintenance/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) loadMaintenance();
  }

  function signOut() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleString('en-RW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/phas-icon.png" alt="PHAS" width={28} height={28} className="rounded-lg" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Operator Portal</p>
              {operatorName && <p className="text-xs text-gray-400 leading-none mt-0.5">{operatorName}</p>}
            </div>
          </div>
          <button onClick={signOut}
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
          <button onClick={() => setTab('incidents')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'incidents'
                ? 'bg-brand text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            Incidents
            {incidents.length > 0 && (
              <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tab === 'incidents' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {incidents.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('maintenance')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'maintenance'
                ? 'bg-brand text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}>
            Maintenance
          </button>
        </div>

        {/* Incidents tab */}
        {tab === 'incidents' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}
            {!loading && !error && incidents.length === 0 && (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">All clear</p>
                <p className="text-sm text-gray-400 mt-1">No active incidents on your platforms.</p>
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
                        {' · '}{inc.cosign_count} co-signs
                        {' · '}{inc.comment_count} comments
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

        {/* Maintenance tab */}
        {tab === 'maintenance' && (
          <div className="space-y-6">
            {/* Create form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Schedule maintenance</h2>
              <div className="space-y-3">
                <input
                  value={mwTitle} onChange={e => setMwTitle(e.target.value)}
                  placeholder="Maintenance title (e.g. Database upgrade)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
                <textarea
                  value={mwDesc} onChange={e => setMwDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Starts at</label>
                    <input type="datetime-local" value={mwStart} onChange={e => setMwStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ends at</label>
                    <input type="datetime-local" value={mwEnd} onChange={e => setMwEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    />
                  </div>
                </div>
                {mwError && <p className="text-red-500 text-xs">{mwError}</p>}
                <button
                  onClick={createWindow} disabled={mwSaving || !mwTitle || !mwStart || !mwEnd}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                  {mwSaving ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </div>

            {/* Upcoming windows */}
            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                Upcoming &amp; active
              </h2>
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
                      className={`rounded-xl border px-4 py-3.5 flex items-start justify-between gap-4 ${
                        active ? 'bg-blue-50/60 border-blue-100' : 'bg-white border-gray-100'
                      }`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{w.title}</p>
                          {active && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Active</span>
                          )}
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
      </div>
    </div>
  );
}
