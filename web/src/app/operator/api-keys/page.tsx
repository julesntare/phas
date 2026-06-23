'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApiKey {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys]         = useState<ApiKey[]>([]);
  const [loading, setLoading]   = useState(true);
  const [label, setLabel]       = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey]     = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState('');

  function getToken() { return localStorage.getItem('operator_token'); }
  function authHeaders() {
    return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
  }

  function logout() {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_info');
    router.replace('/operator');
  }

  async function loadKeys() {
    const token = getToken();
    if (!token) { router.replace('/operator'); return; }
    const res = await fetch('/api/operator/api-keys', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { logout(); return; }
    setKeys(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadKeys(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setCreating(true); setError('');
    const res = await fetch('/api/operator/api-keys', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ label: label.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed'); setCreating(false); return; }
    setNewKey(data.key);
    setLabel('');
    setCreating(false);
    loadKeys();
  }

  async function revokeKey(id: string) {
    await fetch(`/api/operator/api-keys/${id}`, { method: 'DELETE', headers: authHeaders() });
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <span className="text-sm font-semibold text-gray-700">API Keys</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h1 className="text-lg font-extrabold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Use API keys to integrate external systems (e.g. your SMS gateway, maintenance scheduler) with PHAS.
            Keys never expire — revoke them here if compromised.
          </p>
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 font-mono text-xs text-gray-600">
            <p className="font-semibold text-gray-700 font-sans text-xs mb-3">Available endpoints</p>
            <p><span className="text-green-600">POST</span> /api/operator/incidents — open an incident</p>
            <p><span className="text-blue-600">PATCH</span> /api/operator/incidents/:id — acknowledge / resolve</p>
            <p><span className="text-green-600">POST</span> /api/operator/maintenance — schedule maintenance</p>
            <p><span className="text-red-500">DELETE</span> /api/operator/maintenance/:id — cancel maintenance</p>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Send the key in the <code className="bg-gray-100 px-1 rounded">X-Api-Key</code> header on every request.
          </p>
        </div>

        {/* New key revealed */}
        {newKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-2">Copy your key now — it won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 break-all text-gray-800">
                {newKey}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-amber-700 hover:underline">
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Generate new key</h2>
          <form onSubmit={createKey} className="flex gap-2">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. MTN SMS Gateway"
              maxLength={80}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
            />
            <button
              type="submit"
              disabled={creating || !label.trim()}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {creating ? '…' : 'Generate'}
            </button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Key list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-700">Active keys ({keys.length})</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No API keys yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {keys.map(k => (
                <li key={k.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{k.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {timeAgo(k.created_at)}
                      {k.last_used_at && ` · Last used ${timeAgo(k.last_used_at)}`}
                      {!k.last_used_at && ' · Never used'}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
