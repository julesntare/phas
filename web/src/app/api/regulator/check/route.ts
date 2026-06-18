import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/regulator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const [authority] = await sql<{ id: string; password_hash: string | null }[]>`
    SELECT id, password_hash FROM authorities WHERE contact_email = ${email} LIMIT 1
  `;

  if (!authority) {
    return NextResponse.json({ activated: false });
  }

  if (authority.password_hash) {
    return NextResponse.json({ activated: true });
  }

  const code = generateSetupCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await sql`
    UPDATE authorities
    SET setup_token = ${hashToken(code)}, setup_token_expires_at = ${expiresAt}
    WHERE id = ${authority.id}
  `;

  await sendSetupEmail(email, code, 'regulator');

  return NextResponse.json({ activated: false });
}
