import { createHash, randomInt } from 'crypto';

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function verifyOtp(code: string, hash: string): boolean {
  return hashOtp(code) === hash;
}

// Sends the OTP via Africa's Talking SMS API.
// Falls back to console.log when AT_API_KEY is not set (local dev).
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = process.env.AT_API_KEY;

  if (!apiKey) {
    console.log(`[OTP dev] ${phone} → ${code}`);
    return;
  }

  const body = new URLSearchParams({
    username: process.env.AT_USERNAME!,
    to: phone,
    message: `Your PHAS verification code is ${code}. Valid for 10 minutes.`,
    from: process.env.AT_SENDER_ID ?? 'PHAS',
  });

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SMS send failed: ${res.status} ${text}`);
  }
}
