'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'improvement', label: 'Improvement' },
  { value: 'feature',     label: 'New feature'  },
  { value: 'other',       label: 'Other'        },
] as const;

type Category = typeof CATEGORIES[number]['value'];

export default function SuggestionBox({ platformId }: { platformId: string }) {
  const [open, setOpen]           = useState(false);
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [category, setCategory]   = useState<Category>('improvement');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  async function submit() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!body.trim())  { setError('Description is required'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, title: title.trim(), body: body.trim(), category }),
      });
      const data = await res.json();
      if (res.status === 401) { setError('Sign in to submit a suggestion.'); return; }
      if (!res.ok) { setError(data.error ?? 'Failed to submit'); return; }
      setDone(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
        <p className="text-3xl mb-2">💡</p>
        <p className="font-semibold text-gray-700">Suggestion submitted</p>
        <p className="text-sm text-gray-400 mt-1">It will be reviewed by PHAS and forwarded to the operator if approved.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors text-left group"
        >
          <span className="text-xl shrink-0">💡</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-700">Have a suggestion?</p>
            <p className="text-xs text-gray-400 mt-0.5">Suggest an improvement or new feature for this platform</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">Suggest an improvement</p>
            <button onClick={() => { setOpen(false); setError(''); }}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Category</p>
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    category === c.value
                      ? 'bg-brand text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder='e.g. "Add biometric login support"'
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              placeholder="Describe the problem you're facing or the improvement you'd like to see…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setOpen(false); setError(''); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
