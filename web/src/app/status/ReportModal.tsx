'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';

type Step = 'auth' | 'report' | 'success';

interface ReportModalProps {
  platformId: string;
  platformName: string;
  onClose: () => void;
}

export default function ReportModal({ platformId, platformName, onClose }: ReportModalProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [step, setStep]           = useState<Step>(isAuthenticated ? 'report' : 'auth');
  const [reportType, setReportType] = useState<'affected' | 'ok' | null>(null);
  const [freeText, setFreeText]   = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // When session arrives (after sign-in redirect re-opens modal), advance to report.
  if (isAuthenticated && step === 'auth') setStep('report');

  function handleGoogleSignIn() {
    // callbackUrl brings them back to this page; StatusBody will re-open the modal.
    signIn('google', {
      callbackUrl: `${window.location.pathname}?report=${platformId}`,
    });
  }

  async function submitReport() {
    if (!reportType) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, type: reportType, freeText: freeText || undefined, isAnonymous }),
      });
      if (res.status === 401) {
        setStep('auth');
        setError('Session expired. Please sign in again.');
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error);
      setStep('success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-sm">Report issue</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-56">{platformName}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {/* ── Auth step ── */}
          {step === 'auth' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Sign in to submit a report. Your identity is kept private by default — operators only see your report, not your name.
              </p>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <p className="text-center text-xs text-gray-400">
                By signing in you agree to our{' '}
                <Link href="/terms" target="_blank" className="underline hover:text-gray-600">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* ── Report step ── */}
          {step === 'report' && (
            <div className="space-y-4">
              {/* User pill */}
              {session?.user && (
                <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                  {session.user.image && (
                    <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-xs text-gray-600 font-medium truncate">{session.user.name ?? session.user.email}</span>
                </div>
              )}

              <p className="text-sm text-gray-500">
                How is <span className="font-semibold text-gray-800">{platformName}</span> for you right now?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReportType('affected')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    reportType === 'affected' ? 'border-red-400 bg-red-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700">I&apos;m affected</span>
                </button>
                <button
                  onClick={() => setReportType('ok')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    reportType === 'ok' ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700">Working for me</span>
                </button>
              </div>

              <textarea
                placeholder="Optional: describe what you're experiencing…"
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition placeholder-gray-300 resize-none"
              />

              {/* Anonymous toggle */}
              <button
                onClick={() => setIsAnonymous(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-700">
                    {isAnonymous ? 'Anonymous to operator' : 'Share my name with operator'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isAnonymous
                      ? 'Operator sees your report but not your identity'
                      : 'Operator can see your name and may follow up'}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors shrink-0 ${isAnonymous ? 'bg-brand' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </button>

              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={submitReport}
                disabled={loading || !reportType}
                className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-dark transition-colors"
              >
                {loading ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          )}

          {/* ── Success step ── */}
          {step === 'success' && (
            <div className="text-center py-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-base mb-1">Report submitted</p>
              <p className="text-sm text-gray-500">Thank you for helping us monitor {platformName}.</p>
              <button
                onClick={onClose}
                className="mt-5 w-full py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
