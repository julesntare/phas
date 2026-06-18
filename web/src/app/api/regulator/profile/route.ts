import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireRegulatorAuth, hashPassword, verifyPassword } from '@/lib/regulator-auth';

export async function GET(req: NextRequest) {
  let reg;
  try { reg = await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [row] = await sql<{
    id: string; name: string; contact_email: string; contact_name: string | null; avatar_url: string | null;
  }[]>`
    SELECT id, name, contact_email, contact_name, avatar_url
    FROM authorities
    WHERE id = ${reg.sub}
  `;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    email: row.contact_email,
    name: row.contact_name,
    avatarUrl: row.avatar_url,
    authorityId: row.id,
    authorityName: row.name,
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
    await sql`UPDATE authorities SET contact_name = ${name} WHERE id = ${reg.sub}`;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) return NextResponse.json({ error: 'current_password required' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

    const [authority] = await sql<{ password_hash: string | null }[]>`
      SELECT password_hash FROM authorities WHERE id = ${reg.sub}
    `;
    if (!authority?.password_hash || !verifyPassword(currentPassword, authority.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }
    await sql`UPDATE authorities SET password_hash = ${hashPassword(newPassword)} WHERE id = ${reg.sub}`;
  }

  return NextResponse.json({ ok: true });
}
