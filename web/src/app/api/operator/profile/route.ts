import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth, hashPassword, verifyPassword } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let op;
  try { op = await requireOperatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [row] = await sql<{
    id: string; email: string; name: string | null;
    platform_id: string; platform_name: string; category: string;
    base_url: string; authority_name: string;
  }[]>`
    SELECT h.id, h.email, h.name,
           p.id AS platform_id, p.name AS platform_name, p.category, p.base_url,
           a.name AS authority_name
    FROM help_desk_accounts h
    JOIN platforms p ON p.id = h.platform_id
    JOIN authorities a ON a.id = p.authority_id
    WHERE h.id = ${op.sub}
  `;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    email: row.email,
    name: row.name,
    platform: {
      id: row.platform_id,
      name: row.platform_name,
      category: row.category,
      base_url: row.base_url,
      authority_name: row.authority_name,
    },
  });
}

export async function PATCH(req: NextRequest) {
  let op;
  try { op = await requireOperatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const name: string | undefined = typeof body.name === 'string' ? body.name.trim() : undefined;
  const currentPassword: string | undefined = body.current_password;
  const newPassword: string | undefined = body.new_password;

  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    await sql`UPDATE help_desk_accounts SET name = ${name} WHERE id = ${op.sub}`;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) return NextResponse.json({ error: 'current_password required' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

    const [account] = await sql<{ password_hash: string | null }[]>`
      SELECT password_hash FROM help_desk_accounts WHERE id = ${op.sub}
    `;
    if (!account?.password_hash || !verifyPassword(currentPassword, account.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }
    await sql`UPDATE help_desk_accounts SET password_hash = ${hashPassword(newPassword)} WHERE id = ${op.sub}`;
  }

  return NextResponse.json({ ok: true });
}
