'use client';

import { useState, useEffect } from 'react';

const RW_PHONE_RE = /^\+2507[2389]\d{7}$/;
const TOKEN_KEY = 'citizen_token';

type Step = 'phone' | 'otp' | 'report' | 'success';

interface ReportModalProps {
  platformId: string;
  platformName: string;
  onClose: () => void;
}

export default function ReportModal({ platformId, platformName, onClose }: ReportModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [reportType, setReportType] = useState<'affected' | 'ok' | null>(null);
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) { setToken(saved); setStep('report'); }
  }, []);

  async function requestOtp() {
    if (!RW_PHONE_RE.test(phone)) {
      setError('Enter a valid Rwanda phone number (+2507...)');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { token: t } = await res.json();
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t); setStep('report');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  async function submitReport() {
    if (!reportType) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platformId, type: reportType, freeText: freeText || undefined }),
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null); setStep('phone');
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

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
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
          {step === 'phone' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Enter your Rwanda phone number to verify your identity before submitting.</p>
              <input
                type="tel"
                placeholder="+250 7XX XXX XXX"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && requestOtp()}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition placeholder-gray-300"
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={requestOtp}
                disabled={loading || !phone}
                className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-dark transition-colors"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Code sent to</p>
                <p className="text-sm font-semibold text-gray-900">{phone}</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition placeholder-gray-200"
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-dark transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                ← Change number
              </button>
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">How is <span className="font-semibold text-gray-800">{platformName}</span> for you right now?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReportType('affected')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    reportType === 'affected'
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700">I'm affected</span>
                </button>
                <button
                  onClick={() => setReportType('ok')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    reportType === 'ok'
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
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
