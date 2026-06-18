import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/operator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const [platform] = await sql<{ id: string; password_hash: string | null }[]>`
    SELECT id, password_hash FROM platforms WHERE contact_email = ${email} LIMIT 1
  `;

  if (!platform) {
    return NextResponse.json({ activated: false });
  }

  if (platform.password_hash) {
    return NextResponse.json({ activated: true });
  }

  const code = generateSetupCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await sql`
    UPDATE platforms
    SET setup_token = ${hashToken(code)}, setup_token_expires_at = ${expiresAt}
    WHERE id = ${platform.id}
  `;

  await sendSetupEmail(email, code, 'operator');

  return NextResponse.json({ activated: false });
}
