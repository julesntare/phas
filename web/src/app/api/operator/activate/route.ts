import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signOperatorToken, hashPassword, hashToken } from '@/lib/operator-auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  const code: string = (body?.code ?? '').trim().toUpperCase();
  const newPassword: string = body?.newPassword ?? '';

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'email, code, and newPassword are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const [account] = await sql<{
    id: string; email: string; name: string | null; platform_id: string;
    setup_token: string | null; setup_token_expires_at: Date | null;
  }[]>`
    SELECT id, email, name, platform_id, setup_token, setup_token_expires_at
    FROM help_desk_accounts
    WHERE email = ${email}
    LIMIT 1
  `;

  if (!account?.setup_token) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  if (account.setup_token_expires_at && new Date() > new Date(account.setup_token_expires_at)) {
    return NextResponse.json({ error: 'Code has expired — please contact your admin' }, { status: 400 });
  }

  if (account.setup_token !== hashToken(code)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  await sql`
    UPDATE help_desk_accounts
    SET password_hash = ${hashPassword(newPassword)},
        setup_token = NULL,
        setup_token_expires_at = NULL
    WHERE id = ${account.id}
  `;

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
