'use client';

import { useState, useEffect, useCallback } from 'react';

interface Suggestion {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  upvotes: number;
  has_upvoted: boolean;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  public:       { label: 'Community idea',   cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
  forwarded:    { label: 'Sent to operator', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  acknowledged: { label: 'Being considered', cls: 'bg-teal-50 text-teal-700 border-teal-200'       },
  planned:      { label: 'In roadmap',       cls: 'bg-green-50 text-green-700 border-green-200'    },
  declined:     { label: 'Not planned',      cls: 'bg-gray-100 text-gray-500 border-gray-200'      },
};

export default function PublicSuggestions({ platformId }: { platformId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState('');

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

  async function toggleVote(s: Suggestion) {
    if (votingId) return;
    setVotingId(s.id);
    setAuthMsg('');
    try {
      const method = s.has_upvoted ? 'DELETE' : 'POST';
      const res = await fetch(`/api/suggestions/${s.id}/upvote`, { method });
      if (res.status === 401) { setAuthMsg('Sign in to upvote suggestions.'); return; }
      if (!res.ok) return;
      setSuggestions(prev => prev.map(x => x.id === s.id
        ? { ...x, has_upvoted: !x.has_upvoted, upvotes: x.upvotes + (x.has_upvoted ? -1 : 1) }
        : x
      ));
    } finally {
      setVotingId(null);
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
          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleVote(s)}
                  disabled={votingId === s.id}
                  className={`flex flex-col items-center shrink-0 pt-0.5 px-1 rounded-lg transition-colors disabled:opacity-50 ${
                    s.has_upvoted ? 'text-brand' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={s.has_upvoted ? 'Remove upvote' : 'Upvote'}
                >
                  <svg className="w-4 h-4" fill={s.has_upvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-xs font-bold leading-tight">{s.upvotes}</span>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{s.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
