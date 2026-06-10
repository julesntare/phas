import { SignJWT, jwtVerify } from 'jose';
import { hashPassword as _hashPassword, verifyPassword as _verifyPassword } from './operator-auth';
import { hashToken } from './auth';

export { hashToken, _hashPassword as hashPassword, _verifyPassword as verifyPassword };

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS ?? 86400);

export interface RegulatorPayload {
  sub: string;
  email: string;
  authorityId: string | null;
  role: 'regulator';
}

export async function signRegulatorToken(payload: Omit<RegulatorPayload, 'role'>): Promise<string> {
  return new SignJWT({ ...payload, role: 'regulator' } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirySeconds}s`)
    .sign(secret);
}

export async function requireRegulatorAuth(authHeader: string | null): Promise<RegulatorPayload> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  const { payload } = await jwtVerify(authHeader.slice(7), secret);
  const p = payload as unknown as RegulatorPayload;
  if (p.role !== 'regulator') throw new Error('Not a regulator token');
  return p;
}
