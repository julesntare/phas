// Sends transactional emails via the Resend REST API.
// Set RESEND_API_KEY to enable. EMAIL_FROM defaults to "PHAS <alerts@phas.rw>".
// If RESEND_API_KEY is absent, all functions silently no-op.

const RESEND_URL = 'https://api.resend.com/emails';

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.EMAIL_FROM ?? 'PHAS <alerts@phas.rw>';
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error('[mailer] Resend error:', res.status, err);
  }
}

export async function sendIncidentAlert(opts: {
  to: string[];
  platformName: string;
  authorityName: string;
  incidentId: string;
  state: 'detected' | 'recurred';
}): Promise<void> {
  if (opts.to.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://phas.rw';
  const dashboardUrl = `${baseUrl}/operator/dashboard`;
  const incidentUrl  = `${baseUrl}/operator/incidents/${opts.incidentId}`;

  const isRecurrence = opts.state === 'recurred';
  const subject = isRecurrence
    ? `[PHAS] ⚠️ Recurrence detected — ${opts.platformName}`
    : `[PHAS] 🚨 New incident — ${opts.platformName}`;

  const headline = isRecurrence
    ? `A recurring incident has been detected on <strong>${opts.platformName}</strong>.`
    : `A new incident has been automatically detected on <strong>${opts.platformName}</strong>.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1A6ED8 0%,#003A7A 100%);padding:24px 32px">
          <p style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px">PHAS</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.65)">Platform Health Accountability System</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">
            ${isRecurrence ? 'Recurrence Alert' : 'Incident Alert'}
          </p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111827">${opts.platformName}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">${headline}</p>
          <table cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;width:100%;margin-bottom:28px">
            <tr><td style="padding:16px 20px">
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td style="font-size:12px;color:#6b7280;font-weight:600">Platform</td>
                  <td style="font-size:13px;color:#111827;font-weight:600;text-align:right">${opts.platformName}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#6b7280;font-weight:600;padding-top:8px">Authority</td>
                  <td style="font-size:13px;color:#111827;font-weight:600;text-align:right;padding-top:8px">${opts.authorityName}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#6b7280;font-weight:600;padding-top:8px">Status</td>
                  <td style="font-size:13px;color:${isRecurrence ? '#dc2626' : '#d97706'};font-weight:700;text-align:right;padding-top:8px">
                    ${isRecurrence ? 'Recurred' : 'Detected'}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#6b7280;font-weight:600;padding-top:8px">Detected at</td>
                  <td style="font-size:13px;color:#111827;font-weight:600;text-align:right;padding-top:8px">${new Date().toLocaleString('en-RW', { timeZone: 'Africa/Kigali' })} (EAT)</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 12px">
            <a href="${incidentUrl}" style="display:inline-block;background:#0055A4;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px">
              View incident →
            </a>
          </p>
          <p style="margin:0">
            <a href="${dashboardUrl}" style="font-size:13px;color:#0055A4;text-decoration:none">Open dashboard</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6">
          <p style="margin:0;font-size:11px;color:#9ca3af">
            You received this because you are the registered operator for this platform.
            This is an automated alert from PHAS.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();

  await send(opts.to, subject, html);
}
