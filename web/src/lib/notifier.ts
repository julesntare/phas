import sql from './db';

export async function dispatchNotifications(
  platformId: string,
  incidentId: string,
): Promise<void> {
  const targets = await sql<{ user_id: string }[]>`
    SELECT s.user_id FROM subscriptions s
    WHERE s.platform_id = ${platformId}
      AND NOT EXISTS (
        SELECT 1 FROM notifications_sent ns
        WHERE ns.user_id = s.user_id AND ns.incident_id = ${incidentId}
      )
  `;
  if (targets.length === 0) return;

  for (const { user_id } of targets) {
    await sendPush(user_id, incidentId);
    await sql`
      INSERT INTO notifications_sent (user_id, incident_id)
      VALUES (${user_id}, ${incidentId}) ON CONFLICT DO NOTHING
    `;
  }
}

async function sendPush(userId: string, incidentId: string): Promise<void> {
  const fcmKey = process.env.FCM_SERVER_KEY;
  if (!fcmKey) {
    console.log(`[notifier] [dev] push → user=${userId} incident=${incidentId}`);
    return;
  }
  // TODO(Phase 2): look up FCM token from device_tokens table, then POST to FCM.
  console.log(`[notifier] FCM push to user=${userId} (token lookup not yet implemented)`);
}
