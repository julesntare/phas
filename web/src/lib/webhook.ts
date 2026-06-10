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
  const [account] = await sql<{ webhook_url: string | null }[]>`
    SELECT webhook_url FROM help_desk_accounts
    WHERE platform_id = ${platformId} AND webhook_url IS NOT NULL
    LIMIT 1
  `;
  if (!account?.webhook_url) return;

  const [platform] = await sql<{ name: string }[]>`
    SELECT name FROM platforms WHERE id = ${platformId}
  `;

  const payload: WebhookPayload = {
    incidentId,
    platformId,
    platformName: platform?.name ?? '',
    fromState,
    toState,
    note,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(account.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    // Webhook failures are non-fatal — log and continue.
    console.error('[webhook] delivery failed', account.webhook_url, err);
  }
}
