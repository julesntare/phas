import { Resend } from 'resend';
import { randomBytes } from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? 'PHAS <noreply@phas.rw>';

// Unambiguous charset — no I/O/0/1 confusion
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSetupCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return code;
}

export async function sendSetupEmail(
  to: string,
  code: string,
  role: 'operator' | 'regulator',
): Promise<void> {
  const portalName = role === 'operator' ? 'Operator Portal' : 'Regulator Portal';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const loginUrl = `${appUrl}/${role}`;

  if (!resend) {
    console.log(`[email:dev] Setup code for ${to} (${role}): ${code}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your PHAS ${portalName} access`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px">Welcome to PHAS ${portalName}</h2>
        <p style="color:#555;margin:0 0 24px">Your account has been created. Use the code below to set your password and access the portal.</p>
        <div style="background:#f4f4f5;border-radius:12px;padding:20px 24px;text-align:center;margin:0 0 24px">
          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.08em">Setup code</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:.25em;font-family:monospace">${code}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#888">Expires in 48 hours</p>
        </div>
        <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Go to ${portalName}</a>
        <p style="margin:24px 0 0;font-size:12px;color:#aaa">If you did not expect this email, please ignore it.</p>
      </div>
    `,
  });
}
