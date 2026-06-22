import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/debug/notifications?platformId=<uuid>
// Returns a full snapshot of the notification pipeline state for a platform.
// Remove this file once notifications are confirmed working.
export async function GET(req: NextRequest) {
  const platformId = req.nextUrl.searchParams.get('platformId');
  if (!platformId) {
    return NextResponse.json({ error: 'platformId query param required' }, { status: 400 });
  }

  const fcmConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  const [subscriptions, deviceTokens, openIncident, recentNotified] = await Promise.all([
    sql<{ id: string; user_id: string | null; citizen_id: string | null; created_at: Date }[]>`
      SELECT id, user_id, citizen_id, created_at
      FROM subscriptions WHERE platform_id = ${platformId}
      ORDER BY created_at DESC
    `,
    sql<{ id: string; user_id: string | null; citizen_id: string | null; token_prefix: string; platform: string; updated_at: Date }[]>`
      SELECT
        dt.id, dt.user_id, dt.citizen_id,
        LEFT(dt.token, 20) AS token_prefix,
        dt.platform, dt.updated_at
      FROM device_tokens dt
      WHERE EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.platform_id = ${platformId}
          AND (
            (dt.user_id    IS NOT NULL AND s.user_id    = dt.user_id)
            OR (dt.citizen_id IS NOT NULL AND s.citizen_id = dt.citizen_id)
          )
      )
      ORDER BY dt.updated_at DESC
    `,
    sql<{ id: string; state: string; opened_at: Date }[]>`
      SELECT id, state, opened_at
      FROM incidents
      WHERE platform_id = ${platformId} AND state <> 'resolved'
      ORDER BY opened_at DESC LIMIT 1
    `,
    sql<{ incident_id: string; user_id: string | null; citizen_id: string | null; sent_at: Date }[]>`
      SELECT ns.incident_id, ns.user_id, ns.citizen_id, ns.sent_at
      FROM notifications_sent ns
      JOIN incidents i ON i.id = ns.incident_id
      WHERE i.platform_id = ${platformId}
      ORDER BY ns.sent_at DESC LIMIT 20
    `,
  ]);

  return NextResponse.json({
    fcmConfigured,
    subscriptions: {
      total: subscriptions.length,
      phone: subscriptions.filter(s => s.user_id).length,
      google: subscriptions.filter(s => s.citizen_id).length,
      rows: subscriptions,
    },
    deviceTokens: {
      total: deviceTokens.length,
      rows: deviceTokens,
    },
    openIncident: openIncident[0] ?? null,
    recentNotified,
  });
}
