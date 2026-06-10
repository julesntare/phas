import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signRegulatorToken, verifyPassword, hashToken } from '@/lib/regulator-auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  const password: string = body?.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const [account] = await sql<{
    id: string; email: string; name: string | null;
    authority_id: string | null; password_hash: string | null;
  }[]>`
    SELECT id, email, name, authority_id, password_hash
    FROM regulator_accounts
    WHERE email = ${email}
    LIMIT 1
  `;

  if (!account || !account.password_hash || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await signRegulatorToken({
    sub: account.id,
    email: account.email,
    authorityId: account.authority_id,
  });

  const expiresAt = new Date(Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 86400) * 1000);
  await sql`
    INSERT INTO regulator_sessions (regulator_id, token_hash, expires_at)
    VALUES (${account.id}, ${hashToken(token)}, ${expiresAt})
  `;

  return NextResponse.json({
    token,
    regulator: { id: account.id, email: account.email, name: account.name },
  });
}
