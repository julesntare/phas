import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signOperatorToken, verifyPassword, hashToken } from '@/lib/operator-auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  const password: string = body?.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const [account] = await sql<{
    id: string; email: string; name: string | null;
    platform_id: string; password_hash: string | null;
  }[]>`
    SELECT id, email, name, platform_id, password_hash
    FROM help_desk_accounts
    WHERE email = ${email}
    LIMIT 1
  `;

  if (!account || !account.password_hash || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await signOperatorToken({
    sub: account.id,
    email: account.email,
    platformId: account.platform_id,
  });

  const expiresAt = new Date(Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 86400) * 1000);
  await sql`
    INSERT INTO operator_sessions (operator_id, token_hash, expires_at)
    VALUES (${account.id}, ${hashToken(token)}, ${expiresAt})
  `;

  return NextResponse.json({
    token,
    operator: { id: account.id, email: account.email, name: account.name },
  });
}
