import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/operator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const [account] = await sql<{ id: string; password_hash: string | null }[]>`
    SELECT id, password_hash FROM help_desk_accounts WHERE email = ${email} LIMIT 1
  `;

  if (!account) {
    // Same response shape to avoid email enumeration
    return NextResponse.json({ activated: false });
  }

  if (account.password_hash) {
    return NextResponse.json({ activated: true });
  }

  // Not yet activated — generate a fresh code and email it
  const code = generateSetupCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await sql`
    UPDATE help_desk_accounts
    SET setup_token = ${hashToken(code)}, setup_token_expires_at = ${expiresAt}
    WHERE id = ${account.id}
  `;

  await sendSetupEmail(email, code, 'operator');

  return NextResponse.json({ activated: false });
}
