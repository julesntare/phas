import sql from './lib/db';

// Sends "are you affected?" push to platform subscribers who haven't been
// prompted yet for this incident. Uses notifications_sent as a dedup guard.
export async function dispatchNotifications(
  platformId: string,
  incidentId: string,
): Promise<void> {
  // Find subscribers not yet notified for this incident.
  const targets = await sql<{ user_id: string }[]>`
    SELECT s.user_id
    FROM subscriptions s
    WHERE s.platform_id = ${platformId}
      AND NOT EXISTS (
        SELECT 1 FROM notifications_sent ns
        WHERE ns.user_id     = s.user_id
          AND ns.incident_id = ${incidentId}
      )
  `;

  if (targets.length === 0) return;

  console.log(`[notifier] sending to ${targets.length} subscriber(s) for incident ${incidentId}`);

  for (const { user_id } of targets) {
    await sendPush(user_id, incidentId);

    // Record send regardless of push outcome so we don't retry on next cycle.
    await sql`
      INSERT INTO notifications_sent (user_id, incident_id)
      VALUES (${user_id}, ${incidentId})
      ON CONFLICT DO NOTHING
    `;
  }
}

async function sendPush(userId: string, incidentId: string): Promise<void> {
  const fcmKey = process.env.FCM_SERVER_KEY;

  if (!fcmKey) {
    // Phase 1: log to console until FCM is wired up.
    console.log(`[notifier] [dev] push to user=${userId} incident=${incidentId}`);
    return;
  }

  // TODO(Phase 2): look up the user's FCM token from a device_tokens table,
  // then POST to https://fcm.googleapis.com/fcm/send with the "are you
  // affected?" payload. Placeholder for now.
  console.log(`[notifier] FCM push to user=${userId} (token lookup not yet implemented)`);
}
