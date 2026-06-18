import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { hashToken } from '@/lib/operator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const platforms = await sql<{
    id: string; name: string; category: string; base_url: string;
    authority_id: string; authority_name: string;
    contact_email: string | null; contact_name: string | null; avatar_url: string | null;
    webhook_url: string | null; regulator_id: string | null; regulator_email: string | null;
  }[]>`
    SELECT p.id, p.name, p.category, p.base_url,
           p.authority_id, a.name AS authority_name,
           p.contact_email, p.contact_name, p.avatar_url,
           p.webhook_url, p.regulator_id, r.email AS regulator_email
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN regulator_accounts r ON r.id = p.regulator_id
    ORDER BY p.name
  `;

  const regulators = await sql<{
    id: string; email: string; name: string | null; avatar_url: string | null;
    authority_id: string | null; authority_name: string | null; role: string;
  }[]>`
    SELECT r.id, r.email, r.name, r.avatar_url, r.authority_id,
           a.name AS authority_name, r.role
    FROM regulator_accounts r
    LEFT JOIN authorities a ON a.id = r.authority_id
    ORDER BY r.email
  `;

  return NextResponse.json({ platforms, regulators });
}

export async function POST(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { type } = body as { type: 'platform' | 'regulator' };

  if (type === 'platform') {
    const { name, baseUrl, category, authorityId, contactEmail, contactName, webhookUrl, regulatorId } = body as {
      name: string; baseUrl: string; category: string; authorityId: string;
      contactEmail: string; contactName?: string; webhookUrl?: string; regulatorId?: string;
    };

    if (!name || !baseUrl || !category || !authorityId || !contactEmail) {
      return NextResponse.json({ error: 'name, baseUrl, category, authorityId, and contactEmail are required' }, { status: 400 });
    }

    const code = generateSetupCode();
    const tokenHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [row] = await sql<{ id: string }[]>`
      INSERT INTO platforms
        (name, base_url, category, authority_id, contact_email, contact_name, webhook_url, regulator_id, setup_token, setup_token_expires_at)
      VALUES
        (${name}, ${baseUrl}, ${category}, ${authorityId}, ${contactEmail.trim().toLowerCase()},
         ${contactName ?? null}, ${webhookUrl ?? null}, ${regulatorId ?? null}, ${tokenHash}, ${expiresAt})
      RETURNING id
    `;

    await sendSetupEmail(contactEmail, code, 'operator');
    return NextResponse.json({ id: row.id, type: 'platform' }, { status: 201 });
  }

  if (type === 'regulator') {
    const { email, name, authorityId, avatarUrl } = body as {
      email: string; name?: string; authorityId?: string; avatarUrl?: string;
    };

    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

    const code = generateSetupCode();
    const tokenHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [row] = await sql<{ id: string }[]>`
      INSERT INTO regulator_accounts (authority_id, email, name, avatar_url, setup_token, setup_token_expires_at)
      VALUES (${authorityId ?? null}, ${email.trim().toLowerCase()}, ${name ?? null}, ${avatarUrl ?? null}, ${tokenHash}, ${expiresAt})
      RETURNING id
    `;

    await sendSetupEmail(email, code, 'regulator');
    return NextResponse.json({ id: row.id, type: 'regulator' }, { status: 201 });
  }

  return NextResponse.json({ error: 'type must be platform or regulator' }, { status: 400 });
}
