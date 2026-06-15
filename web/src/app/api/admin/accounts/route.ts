import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/operator-auth';

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

  const { type, email, name, password, platformId, authorityId, avatarUrl } = body as {
    type: 'operator' | 'regulator';
    email: string;
    name?: string;
    password: string;
    platformId?: string;
    authorityId?: string;
    avatarUrl?: string;
  };

  if (!type || !email || !password) {
    return NextResponse.json({ error: 'type, email, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const hash = hashPassword(password);

  if (type === 'operator') {
    if (!platformId) return NextResponse.json({ error: 'platformId required for operator' }, { status: 400 });
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO help_desk_accounts (platform_id, email, name, password_hash, avatar_url)
      VALUES (${platformId}, ${email}, ${name ?? null}, ${hash}, ${avatarUrl ?? null})
      RETURNING id
    `;
    return NextResponse.json({ id: row.id, type: 'operator' }, { status: 201 });
  }

  if (type === 'regulator') {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO regulator_accounts (authority_id, email, name, password_hash, avatar_url)
      VALUES (${authorityId ?? null}, ${email}, ${name ?? null}, ${hash}, ${avatarUrl ?? null})
      RETURNING id
    `;
    return NextResponse.json({ id: row.id, type: 'regulator' }, { status: 201 });
  }

  return NextResponse.json({ error: 'type must be operator or regulator' }, { status: 400 });
}
