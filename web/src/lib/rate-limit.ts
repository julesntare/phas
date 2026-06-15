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

export async function isIpRateLimited(
  ipHash: string,
  windowHours: number,
  maxRequests: number,
): Promise<boolean> {
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count
    FROM reports
    WHERE ip_hash    = ${ipHash}
      AND user_id    IS NULL
      AND created_at > NOW() - ${`${windowHours} hours`}::interval
  `;
  return Number(count) >= maxRequests;
}
