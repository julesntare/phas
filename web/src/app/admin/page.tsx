'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLogin() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/meta', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) { setError('Invalid admin secret'); return; }
      sessionStorage.setItem('admin_secret', secret);
      router.push('/admin/dashboard');
    } catch {
      setError('Network error');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Image src="/phas-icon.png" alt="PHAS" width={36} height={36} className="rounded-xl" />
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">PHAS Admin</p>
            <p className="text-xs text-gray-400 mt-0.5">Platform management</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-base font-bold text-gray-800 mb-6">Sign in with admin secret</h1>
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Admin secret key</label>
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Enter ADMIN_SECRET"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!secret || loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
