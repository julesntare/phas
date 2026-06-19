'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import LocalDate from '@/components/LocalDate';

interface Comment {
  id: string;
  content: string;
  district: string | null;
  author_name: string | null;
  created_at: string;
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

export default function IncidentActions({
  incidentId,
  cosignCount: initialCount,
  isResolved,
  initialComments,
}: {
  incidentId: string;
  cosignCount: number;
  isResolved: boolean;
  initialComments: Comment[];
}) {
  const { data: session, status } = useSession();
  const [cosignCount, setCosignCount]   = useState(initialCount);
  const [cosigned, setCosigned]         = useState(false);
  const [cosigning, setCosigning]       = useState(false);
  const [comments, setComments]         = useState<Comment[]>(initialComments);
  const [commentText, setCommentText]   = useState('');
  const [posting, setPosting]           = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function handleCosign() {
    if (status === 'loading') return;
    if (!session) {
      signIn('google', { callbackUrl: window.location.href });
      return;
    }
    setCosigning(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/cosign`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (!data.alreadyCosigned) setCosignCount(c => c + 1);
        setCosigned(true);
      }
    } finally {
      setCosigning(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (!session) {
      signIn('google', { callbackUrl: window.location.href });
      return;
    }
    setPosting(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments(prev => [...prev, c]);
        setCommentText('');
      } else {
        const err = await res.json().catch(() => ({}));
        setCommentError(err.error ?? 'Failed to post comment');
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Co-sign */}
      {!isResolved && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Affected too?</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {cosignCount > 0
                ? `${cosignCount} ${cosignCount === 1 ? 'person' : 'people'} reported this`
                : 'Be the first to confirm this issue'}
            </p>
          </div>
          <button
            onClick={handleCosign}
            disabled={cosigned || cosigning}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              cosigned
                ? 'bg-red-50 text-red-600 border-red-200 cursor-default'
                : 'bg-white text-red-600 border-red-200 hover:bg-red-50 active:scale-95'
            }`}
          >
            {cosigned ? '✓ Confirmed' : cosigning ? '…' : 'Me too'}
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Discussion ({comments.length})
          </h2>
        </div>

        {comments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            No comments yet — be the first to share what you know.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map(c => (
              <div key={c.id} className="px-5 py-3.5">
                <p className="text-sm text-gray-700 leading-snug">{c.content}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <LocalDate date={c.created_at} options={DATE_OPTS} />
                  {c.district && <><span>·</span><span>{c.district}</span></>}
                  {c.author_name && <><span>·</span><span className="text-gray-500">{c.author_name}</span></>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Comment form */}
        <form onSubmit={handleComment} className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          {session ? (
            <>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Share what you know about this issue…"
                maxLength={500}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
              {commentError && (
                <p className="text-xs text-red-500 mt-1">{commentError}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{commentText.length}/500</span>
                <button
                  type="submit"
                  disabled={posting || !commentText.trim()}
                  className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  {posting ? '…' : 'Post'}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: window.location.href })}
              className="w-full text-sm text-gray-500 hover:text-gray-800 py-2 transition-colors"
            >
              Sign in with Google to comment
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
