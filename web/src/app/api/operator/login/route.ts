import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signOperatorToken, verifyPassword, hashToken } from '@/lib/operator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  const password: string = body?.password ?? '';

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const [platform] = await sql<{
    id: string; contact_email: string; contact_name: string | null; password_hash: string | null;
  }[]>`
    SELECT id, contact_email, contact_name, password_hash
    FROM platforms
    WHERE contact_email = ${email}
    LIMIT 1
  `;

  if (!platform) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (!platform.password_hash) {
    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await sql`
      UPDATE platforms
      SET setup_token = ${hashToken(code)}, setup_token_expires_at = ${expiresAt}
      WHERE id = ${platform.id}
    `;
    await sendSetupEmail(email, code, 'operator');
    return NextResponse.json({ not_activated: true });
  }

  if (!verifyPassword(password, platform.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await signOperatorToken({
    sub: platform.id,
    email: platform.contact_email,
    platformId: platform.id,
  });

  const expiresAt = new Date(Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 86400) * 1000);
  await sql`
    INSERT INTO platform_sessions (platform_id, token_hash, expires_at)
    VALUES (${platform.id}, ${hashToken(token)}, ${expiresAt})
  `;

  return NextResponse.json({
    token,
    operator: { id: platform.id, email: platform.contact_email, name: platform.contact_name },
  });
}
