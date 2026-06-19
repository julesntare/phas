'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Step = 'login' | 'activate';

export default function RegulatorLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/regulator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.not_activated) { setStep('activate'); return; }
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      localStorage.setItem('regulator_token', data.token);
      localStorage.setItem('regulator_info', JSON.stringify(data.regulator));
      router.push('/regulator/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/regulator/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.toUpperCase(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Activation failed');
      localStorage.setItem('regulator_token', data.token);
      localStorage.setItem('regulator_info', JSON.stringify(data.regulator));
      router.push('/regulator/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-linear-to-br from-brand-light to-brand-dark p-10">
        <Link href="/" className="flex items-center gap-2 text-white/80 text-sm no-underline hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to PHAS
        </Link>
        <div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-6 p-2">
            <Image src="/phas-icon.png" alt="PHAS logo" width={48} height={48} className="rounded-xl" />
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
            Authority<br />Portal
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Cross-platform health oversight and accountability reporting for Rwanda&apos;s e-service ecosystem.
          </p>
        </div>
        <p className="text-white/30 text-xs">PHAS — Rwanda</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Step 1 — Login */}
          {step === 'login' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900">Sign in</h1>
                <p className="text-gray-500 text-sm mt-1">Authority credentials required</p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    placeholder="authority@example.gov.rw"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Leave blank if first sign-in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          )}

          {/* Step 2 — Activate (first-time setup) */}
          {step === 'activate' && (
            <>
              <div className="mb-8">
                <button onClick={() => { setStep('login'); setError(''); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
                <h1 className="text-2xl font-extrabold text-gray-900">Set your password</h1>
                <p className="text-gray-500 text-sm mt-1">Check your email for the setup code sent to <span className="font-medium text-gray-700">{email}</span></p>
              </div>
              <form onSubmit={handleActivate} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Setup code</label>
                  <input
                    type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required autoFocus
                    placeholder="e.g. ABC2XY89"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">New password</label>
                  <input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                    placeholder="Min. 8 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
                  {loading ? 'Activating…' : 'Activate & sign in'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </main>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-sm">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </div>
  );
}
