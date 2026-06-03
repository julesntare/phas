import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateOtp, hashOtp, sendOtpSms } from '@/lib/otp';

// Rwanda mobile format: +2507XXXXXXXX (MTN +25078/+25073, Airtel +25072)
const RW_PHONE_RE = /^\+2507[2389]\d{7}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone: string = body?.phone ?? '';

  if (!RW_PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await sql`
    INSERT INTO otp_codes (phone, code_hash, expires_at)
    VALUES (${phone}, ${codeHash}, ${expiresAt})
  `;

  await sendOtpSms(phone, code);

  return NextResponse.json({ message: 'OTP sent' });
}
