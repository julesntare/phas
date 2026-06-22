import { createSign } from 'crypto';
import sql from './db';

// ── FCM v1 via service-account JWT (no extra npm dependencies) ────────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function base64url(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(sa.private_key, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

async function sendFcmMessage(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  accessToken: string,
  projectId: string,
): Promise<'ok' | 'invalid_token'> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        android: { priority: 'HIGH' },
      },
    }),
  });

  if (res.ok) return 'ok';

  const err = await res.json() as { error?: { details?: { errorCode?: string }[] } };
  const code = err?.error?.details?.[0]?.errorCode;
  if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') return 'invalid_token';

  console.error('[notifier] FCM error', err);
  return 'ok'; // non-fatal for other errors
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolveServiceAccount(): Promise<{ sa: ServiceAccount; accessToken: string } | null> {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!saRaw) return null;
  const sa: ServiceAccount = JSON.parse(Buffer.from(saRaw, 'base64').toString('utf8'));
  const accessToken = await getFcmAccessToken(sa);
  return { sa, accessToken };
}

async function sendToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
  accessToken: string,
  projectId: string,
): Promise<void> {
  const stale: string[] = [];
  for (const token of tokens) {
    const result = await sendFcmMessage(token, title, body, data, accessToken, projectId);
    if (result === 'invalid_token') stale.push(token);
  }
  if (stale.length > 0) {
    await sql`DELETE FROM device_tokens WHERE token = ANY(${stale})`;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

interface SubscriptionTarget {
  user_id: string | null;
  citizen_id: string | null;
}

// Query device tokens for all subscribers of a platform (phone OTP + Google).
async function subscriberTokens(platformId: string): Promise<string[]> {
  const rows = await sql<{ token: string }[]>`
    SELECT dt.token
    FROM device_tokens dt
    WHERE EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.platform_id = ${platformId}
        AND (
          (dt.user_id    IS NOT NULL AND s.user_id    = dt.user_id)
          OR (dt.citizen_id IS NOT NULL AND s.citizen_id = dt.citizen_id)
        )
    )
  `;
  return rows.map(r => r.token);
}

// Sends operator state-change updates to all platform subscribers.
// Does NOT use the notifications_sent dedup table — operator updates are
// always delivered regardless of whether the user saw the initial alert.
export async function dispatchOperatorUpdate(
  platformId: string,
  incidentId: string,
  title: string,
  body: string,
): Promise<void> {
  const creds = await resolveServiceAccount();
  if (!creds) return;

  const tokens = await subscriberTokens(platformId);
  if (tokens.length === 0) return;

  const [platform] = await sql<{ name: string }[]>`SELECT name FROM platforms WHERE id = ${platformId}`;
  const data = { incidentId, platformId, platformName: platform?.name ?? '' };

  await sendToTokens(tokens, title, body, data, creds.accessToken, creds.sa.project_id);
}

// Sends a "is it working now?" prompt to subscribers when an incident resolves.
// Uses platformId in the data payload so the app deep-links to the platform page.
export async function dispatchResolutionFeedback(
  platformId: string,
  incidentId: string,
): Promise<void> {
  const creds = await resolveServiceAccount();
  if (!creds) return;

  const [platform] = await sql<{ name: string }[]>`SELECT name FROM platforms WHERE id = ${platformId}`;
  const platformName = platform?.name ?? 'Platform';

  const tokens = await subscriberTokens(platformId);
  if (tokens.length === 0) return;

  await sendToTokens(
    tokens,
    `✅ ${platformName} — Issue resolved`,
    'Is it working for you now? Open the app to report.',
    { incidentId, platformId, platformName, type: 'resolved' },
    creds.accessToken,
    creds.sa.project_id,
  );
}

export async function dispatchNotifications(
  platformId: string,
  incidentId: string,
): Promise<void> {
  const [platform] = await sql<{ name: string }[]>`
    SELECT name FROM platforms WHERE id = ${platformId}
  `;

  // Subscribers (phone OTP + Google) who haven't been notified yet.
  const targets = await sql<SubscriptionTarget[]>`
    SELECT s.user_id, s.citizen_id FROM subscriptions s
    WHERE s.platform_id = ${platformId}
      AND NOT EXISTS (
        SELECT 1 FROM notifications_sent ns
        WHERE ns.incident_id = ${incidentId}
          AND (
            (s.user_id    IS NOT NULL AND ns.user_id    = s.user_id)
            OR (s.citizen_id IS NOT NULL AND ns.citizen_id = s.citizen_id)
          )
      )
  `;
  if (targets.length === 0) return;

  // Collect device tokens for both user types.
  const userIds    = targets.filter(t => t.user_id).map(t => t.user_id!);
  const citizenIds = targets.filter(t => t.citizen_id).map(t => t.citizen_id!);

  const tokenRows: { token: string }[] = [];
  if (userIds.length > 0) {
    tokenRows.push(...await sql<{ token: string }[]>`
      SELECT token FROM device_tokens WHERE user_id = ANY(${userIds}::uuid[])
    `);
  }
  if (citizenIds.length > 0) {
    tokenRows.push(...await sql<{ token: string }[]>`
      SELECT token FROM device_tokens WHERE citizen_id = ANY(${citizenIds}::uuid[])
    `);
  }

  await markNotified(targets, incidentId);
  if (tokenRows.length === 0) return;

  const creds = await resolveServiceAccount();
  if (!creds) return;

  const title = `⚠️ ${platform?.name ?? 'A platform'} is having issues`;
  const body  = 'Others are reporting problems. Tap to follow the incident.';
  const data  = { incidentId, platformId, platformName: platform?.name ?? '' };

  await sendToTokens(tokenRows.map(r => r.token), title, body, data, creds.accessToken, creds.sa.project_id);
}

async function markNotified(targets: SubscriptionTarget[], incidentId: string): Promise<void> {
  for (const t of targets) {
    await sql`
      INSERT INTO notifications_sent (user_id, citizen_id, incident_id)
      VALUES (${t.user_id ?? null}, ${t.citizen_id ?? null}, ${incidentId})
      ON CONFLICT DO NOTHING
    `;
  }
}
