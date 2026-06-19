import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signRegulatorToken, verifyPassword, hashToken } from '@/lib/regulator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  const password: string = body?.password ?? '';

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const [authority] = await sql<{
    id: string; contact_email: string; contact_name: string | null; password_hash: string | null;
  }[]>`
    SELECT id, contact_email, contact_name, password_hash
    FROM authorities
    WHERE contact_email = ${email}
    LIMIT 1
  `;

  if (!authority) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (!authority.password_hash) {
    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await sql`
      UPDATE authorities
      SET setup_token = ${hashToken(code)}, setup_token_expires_at = ${expiresAt}
      WHERE id = ${authority.id}
    `;
    await sendSetupEmail(email, code, 'regulator');
    return NextResponse.json({ not_activated: true });
  }

  if (!verifyPassword(password, authority.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

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
