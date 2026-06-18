import { SignJWT, jwtVerify } from 'jose';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { hashToken } from './auth';
import sql from './db';

export { hashToken };

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 86400);

export interface OperatorPayload {
  sub: string;       // operator id
  email: string;
  platformId: string;
  role: 'operator';
}

export async function signOperatorToken(payload: Omit<OperatorPayload, 'role'>): Promise<string> {
  return new SignJWT({ ...payload, role: 'operator' } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirySeconds}s`)
    .sign(secret);
}

export async function verifyOperatorToken(token: string): Promise<OperatorPayload> {
  const { payload } = await jwtVerify(token, secret);
  const p = payload as unknown as OperatorPayload;
  if (p.role !== 'operator') throw new Error('Not an operator token');
  return p;
}

export async function requireOperatorAuth(authHeader: string | null): Promise<OperatorPayload> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  const payload = await verifyOperatorToken(authHeader.slice(7));
  const [row] = await sql<{ id: string }[]>`SELECT id FROM platforms WHERE id = ${payload.sub} LIMIT 1`;
  if (!row) throw new Error('Platform not found');
  return payload;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  const hash = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(storedHash, 'hex'), hash);
}
