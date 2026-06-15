import sql from './db';

export async function isRateLimited(
  userId: string,
  windowHours: number,
  maxRequests: number,
): Promise<boolean> {
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count
    FROM reports
    WHERE user_id    = ${userId}
      AND created_at > NOW() - ${`${windowHours} hours`}::interval
  `;
  return Number(count) >= maxRequests;
}

// In-memory rate limit for anonymous reports — resets on server restart, fine for MVP.
const anonHits = new Map<string, number[]>();

export function isAnonRateLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const hits = (anonHits.get(key) ?? []).filter(t => now - t < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  anonHits.set(key, hits);
  return false;
}
