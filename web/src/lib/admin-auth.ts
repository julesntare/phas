import { NextRequest } from 'next/server';

export function requireAdminAuth(req: NextRequest): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET not configured');
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || header.slice(7) !== secret) {
    throw new Error('Unauthorized');
  }
}
