'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Suggestion {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  upvotes: number;
  user_vote: 'up' | 'down' | null;
  user_comment: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  public:       { label: 'Community idea',   cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
  forwarded:    { label: 'Sent to operator', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  acknowledged: { label: 'Being considered', cls: 'bg-teal-50 text-teal-700 border-teal-200'       },
  planned:      { label: 'In roadmap',       cls: 'bg-green-50 text-green-700 border-green-200'    },
  declined:     { label: 'Not planned',      cls: 'bg-gray-100 text-gray-500 border-gray-200'      },
};

type PanelState = { id: string; voteType: 'up' | 'down'; comment: string } | null;

export default function PublicSuggestions({ platformId }: { platformId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [panel, setPanel]             = useState<PanelState>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [authMsg, setAuthMsg]         = useState('');
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/suggestions?platform_id=${platformId}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [platformId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (panel) setTimeout(() => commentRef.current?.focus(), 50);
  }, [panel?.id]);

  function openPanel(s: Suggestion, voteType: 'up' | 'down') {
    setAuthMsg('');
    // Clicking the already-active vote button removes the vote.
    if (s.user_vote === voteType) {
      removeVote(s);
      return;
    }
    setPanel({
      id: s.id,
      voteType,
      comment: s.user_vote === voteType ? (s.user_comment ?? '') : '',
    });
  }

  async function removeVote(s: Suggestion) {
    setPanel(null);
    const res = await fetch(`/api/suggestions/${s.id}/upvote`, { method: 'DELETE' });
    if (res.status === 401) { setAuthMsg('Sign in to vote.'); return; }
    if (!res.ok) return;
    setSuggestions(prev => prev.map(x => x.id === s.id
      ? { ...x, user_vote: null, user_comment: null, upvotes: x.upvotes + (x.user_vote === 'up' ? -1 : 1) }
      : x
    ));
  }

  async function submitVote() {
    if (!panel || submitting) return;
    setSubmitting(true);
    setAuthMsg('');
    try {
      const res = await fetch(`/api/suggestions/${panel.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType: panel.voteType, comment: panel.comment }),
      });
      if (res.status === 401) { setAuthMsg('Sign in to vote.'); return; }
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(prev => prev.map(x => x.id === panel.id
        ? { ...x, user_vote: panel.voteType, user_comment: panel.comment || null, upvotes: data.upvotes ?? x.upvotes }
        : x
      ));
      setPanel(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || suggestions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Community suggestions
        </h2>
        <span className="text-xs text-gray-400">
          {suggestions.length} idea{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {authMsg && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {authMsg}
        </p>
      )}

      <div className="space-y-2">
        {suggestions.map(s => {
          const meta = STATUS_META[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
          const isPanelOpen = panel?.id === s.id;

          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Suggestion row */}
              <div className="px-4 py-3 flex items-start gap-3">
                {/* Vote buttons */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => openPanel(s, 'up')}
                    className={`p-1 rounded-lg transition-colors ${
                      s.user_vote === 'up'
                        ? 'text-brand bg-brand/10'
                        : 'text-gray-400 hover:text-brand hover:bg-brand/5'
                    }`}
                    title="Upvote"
                  >
                    <svg className="w-4 h-4" fill={s.user_vote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  <span className={`text-xs font-bold leading-none tabular-nums ${
                    s.upvotes > 0 ? 'text-brand' : s.upvotes < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {s.upvotes > 0 ? `+${s.upvotes}` : s.upvotes}
                  </span>

                  <button
                    onClick={() => openPanel(s, 'down')}
                    className={`p-1 rounded-lg transition-colors ${
                      s.user_vote === 'down'
                        ? 'text-red-500 bg-red-50'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-50/60'
                    }`}
                    title="Downvote"
                  >
                    <svg className="w-4 h-4" fill={s.user_vote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{s.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.body}</p>

                  {/* Show user's existing comment if any and panel not open */}
                  {s.user_vote && s.user_comment && !isPanelOpen && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <span className="text-xs text-gray-400">Your note:</span>
                      <span className="text-xs text-gray-600 italic flex-1">{s.user_comment}</span>
                      <button
                        onClick={() => setPanel({ id: s.id, voteType: s.user_vote!, comment: s.user_comment ?? '' })}
                        className="text-xs text-brand hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline vote panel */}
              {isPanelOpen && panel && (
                <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3 space-y-2.5">
                  {/* Vote type toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPanel(p => p ? { ...p, voteType: 'up' } : p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        panel.voteType === 'up'
                          ? 'bg-brand text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-brand/40'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Upvote
                    </button>
                    <button
                      onClick={() => setPanel(p => p ? { ...p, voteType: 'down' } : p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        panel.voteType === 'down'
                          ? 'bg-red-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Downvote
                    </button>
                  </div>

                  {/* Comment */}
                  <textarea
                    ref={commentRef}
                    value={panel.comment}
                    onChange={e => setPanel(p => p ? { ...p, comment: e.target.value } : p)}
                    maxLength={200}
                    rows={2}
                    placeholder="Why? (optional, 200 chars)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                  />

                  <div className="flex items-center justify-between gap-2">
                    {s.user_vote && (
                      <button
                        onClick={() => removeVote(s)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove vote
                      </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => setPanel(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitVote}
                        disabled={submitting}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white disabled:opacity-50"
                      >
                        {submitting ? '…' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
