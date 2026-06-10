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
    fetch('/api/operator/incidents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setIncidents(data); else setError(data.error ?? 'Failed to load'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-brand-light to-brand-dark flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-extrabold text-gray-900">Active Incidents</h1>
          {!loading && (
            <span className="text-xs text-gray-400 bg-white border border-gray-100 px-2.5 py-1 rounded-full">
              {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
            </span>
          )}
        </div>

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
      </div>
    </div>
  );
}
