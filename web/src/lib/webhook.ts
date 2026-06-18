import sql from './db';

interface WebhookPayload {
  incidentId: string;
  platformId: string;
  platformName: string;
  fromState: string | null;
  toState: string;
  note: string | null;
  timestamp: string;
}

export async function dispatchWebhook(
  platformId: string,
  incidentId: string,
  fromState: string | null,
  toState: string,
  note: string | null = null,
): Promise<void> {
  const [platform] = await sql<{ name: string; webhook_url: string | null }[]>`
    SELECT name, webhook_url FROM platforms WHERE id = ${platformId}
  `;
  if (!platform?.webhook_url) return;

  const payload: WebhookPayload = {
    incidentId,
    platformId,
    platformName: platform.name,
    fromState,
    toState,
    note,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(platform.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('[webhook] delivery failed', platform.webhook_url, err);
  }
}
