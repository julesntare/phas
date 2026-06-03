import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyOtp } from '@/lib/otp';
import { signToken, hashToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone: string = body?.phone ?? '';
  const code: string = body?.code ?? '';

  if (!phone || !code) {
    return NextResponse.json({ error: 'phone and code required' }, { status: 400 });
  }

  // Find the latest unused, unexpired OTP for this phone.
  const [otp] = await sql<{ id: string; code_hash: string }[]>`
    SELECT id, code_hash
    FROM otp_codes
    WHERE phone      = ${phone}
      AND used       = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!otp || !verifyOtp(code, otp.code_hash)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  // Mark OTP used (single-use).
  await sql`UPDATE otp_codes SET used = TRUE WHERE id = ${otp.id}`;

  // Upsert user record.
  const [user] = await sql<{ id: string; phone: string; district: string | null }[]>`
    INSERT INTO users (phone)
    VALUES (${phone})
    ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
    RETURNING id, phone, district
  `;

  // Issue JWT and persist session hash for revocation support.
  const token = await signToken({ sub: user.id, phone: user.phone });
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + Number(process.env.JWT_EXPIRY_SECONDS ?? 86400) * 1000);

  await sql`
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt})
  `;

  return NextResponse.json({ token, user });
}
