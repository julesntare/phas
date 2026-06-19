'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'email' | 'password' | 'activate';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/operator/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setStep(data.activated ? 'password' : 'activate');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      localStorage.setItem('operator_token', data.token);
      localStorage.setItem('operator_info', JSON.stringify(data.operator));
      router.push('/operator/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/operator/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.toUpperCase(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Activation failed');
      localStorage.setItem('operator_token', data.token);
      localStorage.setItem('operator_info', JSON.stringify(data.operator));
      router.push('/operator/dashboard');
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
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
            Platform<br />Portal
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Manage platform incidents, post updates, and coordinate resolutions for the platforms you operate.
          </p>
        </div>
        <p className="text-white/30 text-xs">PHAS — Rwanda</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Step 1 — Email */}
          {step === 'email' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900">Sign in</h1>
                <p className="text-gray-500 text-sm mt-1">Platform credentials required</p>
              </div>
              <form onSubmit={handleEmailContinue} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    placeholder="platform@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  />
                </div>
                {error && <ErrorBox message={error} />}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
                  {loading ? 'Checking…' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {/* Step 2a — Password (activated account) */}
          {step === 'password' && (
            <>
              <div className="mb-8">
                <button onClick={() => { setStep('email'); setError(''); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
                <h1 className="text-2xl font-extrabold text-gray-900">Enter password</h1>
                <p className="text-gray-500 text-sm mt-1 truncate">{email}</p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
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

          {/* Step 2b — Activate (first-time setup) */}
          {step === 'activate' && (
            <>
              <div className="mb-8">
                <button onClick={() => { setStep('email'); setError(''); }}
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
