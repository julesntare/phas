'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/status' })}
      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-200 hover:bg-red-50"
    >
      Sign out
    </button>
  );
}
