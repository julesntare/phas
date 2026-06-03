import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 86400);

export interface JWTPayload {
  sub: string;   // user id
  phone: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirySeconds}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Extracts and verifies the Bearer token from an Authorization header.
// Throws if missing or invalid — callers should catch and return 401.
export async function requireAuth(authHeader: string | null): Promise<JWTPayload> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  return verifyToken(authHeader.slice(7));
}
