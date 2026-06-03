import sql from './db';

// Checks whether userId has exceeded maxRequests within windowHours.
// Uses a DB COUNT query — no extra infrastructure needed for Phase 1.
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
