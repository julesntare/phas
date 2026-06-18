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
    webhook_url: string | null;
  }[]>`
    SELECT p.id, p.name, p.category, p.base_url,
           p.authority_id, a.name AS authority_name,
           p.contact_email, p.contact_name, p.avatar_url, p.webhook_url
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    ORDER BY p.name
  `;

  const authorities = await sql<{
    id: string; name: string; remit_description: string | null;
    contact_email: string | null; contact_name: string | null; avatar_url: string | null;
  }[]>`
    SELECT id, name, remit_description, contact_email, contact_name, avatar_url
    FROM authorities
    ORDER BY name
  `;

  return NextResponse.json({ platforms, authorities });
}

export async function POST(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { type } = body as { type: 'platform' | 'authority' };

  if (type === 'platform') {
    const { name, baseUrl, category, authorityId, contactEmail, contactName, webhookUrl } = body as {
      name: string; baseUrl: string; category: string; authorityId: string;
      contactEmail: string; contactName?: string; webhookUrl?: string;
    };

    if (!name || !baseUrl || !category || !authorityId || !contactEmail) {
      return NextResponse.json({ error: 'name, baseUrl, category, authorityId, and contactEmail are required' }, { status: 400 });
    }

    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [row] = await sql<{ id: string }[]>`
      INSERT INTO platforms
        (name, base_url, category, authority_id, contact_email, contact_name, webhook_url, setup_token, setup_token_expires_at)
      VALUES
        (${name}, ${baseUrl}, ${category}, ${authorityId},
         ${contactEmail.trim().toLowerCase()}, ${contactName ?? null},
         ${webhookUrl ?? null}, ${hashToken(code)}, ${expiresAt})
      RETURNING id
    `;

    await sendSetupEmail(contactEmail, code, 'operator');
    return NextResponse.json({ id: row.id, type: 'platform' }, { status: 201 });
  }

  if (type === 'authority') {
    const { name, remitDescription, contactEmail, contactName } = body as {
      name: string; remitDescription?: string; contactEmail: string; contactName?: string;
    };

    if (!name || !contactEmail) {
      return NextResponse.json({ error: 'name and contactEmail are required' }, { status: 400 });
    }

    const code = generateSetupCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [row] = await sql<{ id: string }[]>`
      INSERT INTO authorities (name, remit_description, contact_email, contact_name, setup_token, setup_token_expires_at)
      VALUES (${name}, ${remitDescription ?? null}, ${contactEmail.trim().toLowerCase()}, ${contactName ?? null}, ${hashToken(code)}, ${expiresAt})
      RETURNING id
    `;

    await sendSetupEmail(contactEmail, code, 'regulator');
    return NextResponse.json({ id: row.id, type: 'authority' }, { status: 201 });
  }

  return NextResponse.json({ error: 'type must be platform or authority' }, { status: 400 });
}
