import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { hashToken } from '@/lib/operator-auth';
import { generateSetupCode, sendSetupEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const operators = await sql<{
    id: string; email: string; name: string | null; avatar_url: string | null;
    platform_id: string; platform_name: string; role: string;
  }[]>`
    SELECT h.id, h.email, h.name, h.avatar_url, h.platform_id,
           p.name AS platform_name, h.role
    FROM help_desk_accounts h
    JOIN platforms p ON p.id = h.platform_id
    ORDER BY p.name, h.email
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

  return NextResponse.json({ operators, regulators });
}

export async function POST(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { type, email, name, platformId, authorityId, avatarUrl } = body as {
    type: 'operator' | 'regulator';
    email: string;
    name?: string;
    platformId?: string;
    authorityId?: string;
    avatarUrl?: string;
  };

  if (!type || !email) {
    return NextResponse.json({ error: 'type and email are required' }, { status: 400 });
  }

  const code = generateSetupCode();
  const tokenHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  if (type === 'operator') {
    if (!platformId) return NextResponse.json({ error: 'platformId required for operator' }, { status: 400 });
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO help_desk_accounts (platform_id, email, name, avatar_url, setup_token, setup_token_expires_at)
      VALUES (${platformId}, ${email}, ${name ?? null}, ${avatarUrl ?? null}, ${tokenHash}, ${expiresAt})
      RETURNING id
    `;
    await sendSetupEmail(email, code, 'operator');
    return NextResponse.json({ id: row.id, type: 'operator' }, { status: 201 });
  }

  if (type === 'regulator') {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO regulator_accounts (authority_id, email, name, avatar_url, setup_token, setup_token_expires_at)
      VALUES (${authorityId ?? null}, ${email}, ${name ?? null}, ${avatarUrl ?? null}, ${tokenHash}, ${expiresAt})
      RETURNING id
    `;
    await sendSetupEmail(email, code, 'regulator');
    return NextResponse.json({ id: row.id, type: 'regulator' }, { status: 201 });
  }

  return NextResponse.json({ error: 'type must be operator or regulator' }, { status: 400 });
}
