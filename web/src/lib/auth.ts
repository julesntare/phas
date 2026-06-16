import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 86400);

// Phone OTP citizen (users table)
export interface JWTPayload {
  sub: string;
  phone: string;
}

// Google OAuth citizen (citizen_accounts table) — used by mobile Bearer tokens
export interface CitizenJWTPayload {
  sub: string;
  type: 'citizen_google';
  email: string;
}

export function isCitizenToken(p: JWTPayload | CitizenJWTPayload): p is CitizenJWTPayload {
  return (p as CitizenJWTPayload).type === 'citizen_google';
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirySeconds}s`)
    .sign(secret);
}

export async function signCitizenToken(payload: CitizenJWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

export async function verifyAnyToken(token: string): Promise<JWTPayload | CitizenJWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload | CitizenJWTPayload;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function requireAuth(authHeader: string | null): Promise<JWTPayload> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  return verifyToken(authHeader.slice(7));
}
