'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function CoSignButton({ incidentId }: { incidentId: string }) {
  const { data: session, status } = useSession();
  const [done, setDone]     = useState(false);
  const [busy, setBusy]     = useState(false);

  async function handleClick() {
    if (status === 'loading') return;
    if (!session) {
      signIn('google', { callbackUrl: window.location.href });
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/incidents/${incidentId}/cosign`, { method: 'POST' });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={done || busy}
      className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
        done
          ? 'bg-red-50 text-red-500 border-red-200 cursor-default'
          : 'bg-white text-red-500 border-red-200 hover:bg-red-50 active:scale-95'
      }`}
    >
      {done ? '✓ Me too' : busy ? '…' : 'Me too'}
    </button>
  );
}
