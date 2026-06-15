import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireRegulatorAuth } from '@/lib/regulator-auth';
import { hashPassword, verifyPassword } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let reg;
  try { reg = await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [row] = await sql<{
    id: string; email: string; name: string | null; avatar_url: string | null;
    authority_id: string | null; authority_name: string | null;
  }[]>`
    SELECT r.id, r.email, r.name, r.avatar_url, r.authority_id, a.name AS authority_name
    FROM regulator_accounts r
    LEFT JOIN authorities a ON a.id = r.authority_id
    WHERE r.id = ${reg.sub}
  `;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    authorityId: row.authority_id,
    authorityName: row.authority_name,
  });
}

export async function PATCH(req: NextRequest) {
  let reg;
  try { reg = await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const name: string | undefined = typeof body.name === 'string' ? body.name.trim() : undefined;
  const currentPassword: string | undefined = body.current_password;
  const newPassword: string | undefined = body.new_password;

  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    await sql`UPDATE regulator_accounts SET name = ${name} WHERE id = ${reg.sub}`;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) return NextResponse.json({ error: 'current_password required' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

    const [account] = await sql<{ password_hash: string | null }[]>`
      SELECT password_hash FROM regulator_accounts WHERE id = ${reg.sub}
    `;
    if (!account?.password_hash || !verifyPassword(currentPassword, account.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }
    await sql`UPDATE regulator_accounts SET password_hash = ${hashPassword(newPassword)} WHERE id = ${reg.sub}`;
  }

  return NextResponse.json({ ok: true });
}
