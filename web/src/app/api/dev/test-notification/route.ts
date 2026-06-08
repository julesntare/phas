import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { dispatchNotifications } from '@/lib/notifier';

// Guarded by SEED_ENABLED — same flag as seed-incident.
// Sends a real FCM push to the authenticated user's device so you can test
// the full notification → tap → deep-link flow on a physical device.
export async function POST(req: NextRequest) {
  if (!process.env.SEED_ENABLED) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  let user;
  try {
    user = await requireAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { platformId } = body ?? {};
  if (!platformId) {
    return NextResponse.json({ error: 'platformId required' }, { status: 400 });
  }

  // Verify the user has a registered device token.
  const [tokenRow] = await sql<{ token: string }[]>`
    SELECT token FROM device_tokens WHERE user_id = ${user.sub} LIMIT 1
  `;
  if (!tokenRow) {
    return NextResponse.json(
      { error: 'No device token found. Launch the app and log in first.' },
      { status: 400 },
    );
  }

  // Find or create an open incident for this platform.
  let [incident] = await sql<{ id: string }[]>`
    SELECT id FROM incidents
    WHERE platform_id = ${platformId} AND state <> 'resolved'
    ORDER BY opened_at DESC LIMIT 1
  `;

  if (!incident) {
    // Auto-seed a minimal incident if none exists.
    const [created] = await sql<{ id: string }[]>`
      INSERT INTO incidents (platform_id, state, confidence)
      VALUES (${platformId}, 'confirmed', 0.75)
      RETURNING id
    `;
    await sql`
      INSERT INTO incident_events (incident_id, from_state, to_state, source)
      VALUES (${created.id}, NULL, 'detected', 'crowd'),
             (${created.id}, 'detected', 'confirmed', 'crowd')
    `;
    incident = created;
  }

  // Ensure the user is subscribed so dispatchNotifications picks them up.
  await sql`
    INSERT INTO subscriptions (user_id, platform_id)
    VALUES (${user.sub}, ${platformId})
    ON CONFLICT DO NOTHING
  `;

  // Clear any previous notification_sent record so this fires again.
  await sql`
    DELETE FROM notifications_sent
    WHERE user_id = ${user.sub} AND incident_id = ${incident.id}
  `;

  await dispatchNotifications(platformId, incident.id);

  return NextResponse.json({ ok: true, incidentId: incident.id });
}
