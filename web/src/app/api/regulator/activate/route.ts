import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signRegulatorToken, hashPassword, hashToken } from '@/lib/regulator-auth';

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

  const [authority] = await sql<{
    id: string; contact_email: string; contact_name: string | null;
    setup_token: string | null; setup_token_expires_at: Date | null;
  }[]>`
    SELECT id, contact_email, contact_name, setup_token, setup_token_expires_at
    FROM authorities
    WHERE contact_email = ${email}
    LIMIT 1
  `;

  if (!authority?.setup_token) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  if (authority.setup_token_expires_at && new Date() > new Date(authority.setup_token_expires_at)) {
    return NextResponse.json({ error: 'Code has expired — please contact your admin' }, { status: 400 });
  }

  if (authority.setup_token !== hashToken(code)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  await sql`
    UPDATE authorities
    SET password_hash = ${hashPassword(newPassword)},
        setup_token = NULL,
        setup_token_expires_at = NULL
    WHERE id = ${authority.id}
  `;

  const token = await signRegulatorToken({
    sub: authority.id,
    email: authority.contact_email,
    authorityId: authority.id,
  });

  const expiresAt = new Date(Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 86400) * 1000);
  await sql`
    INSERT INTO authority_sessions (authority_id, token_hash, expires_at)
    VALUES (${authority.id}, ${hashToken(token)}, ${expiresAt})
  `;

  return NextResponse.json({
    token,
    regulator: { id: authority.id, email: authority.contact_email, name: authority.contact_name },
  });
}
