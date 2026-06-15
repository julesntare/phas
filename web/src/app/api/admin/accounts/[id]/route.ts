import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/operator-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { type, name, avatarUrl, password, platformId, authorityId } = body as {
    type: 'operator' | 'regulator';
    name?: string;
    avatarUrl?: string;
    password?: string;
    platformId?: string;
    authorityId?: string;
  };

  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });
  const { id } = await params;

  if (type === 'operator') {
    if (name !== undefined) await sql`UPDATE help_desk_accounts SET name = ${name} WHERE id = ${id}`;
    if (avatarUrl !== undefined) await sql`UPDATE help_desk_accounts SET avatar_url = ${avatarUrl} WHERE id = ${id}`;
    if (password) await sql`UPDATE help_desk_accounts SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;
    if (platformId) await sql`UPDATE help_desk_accounts SET platform_id = ${platformId} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  if (type === 'regulator') {
    if (name !== undefined) await sql`UPDATE regulator_accounts SET name = ${name} WHERE id = ${id}`;
    if (avatarUrl !== undefined) await sql`UPDATE regulator_accounts SET avatar_url = ${avatarUrl} WHERE id = ${id}`;
    if (password) await sql`UPDATE regulator_accounts SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;
    if (authorityId !== undefined) await sql`UPDATE regulator_accounts SET authority_id = ${authorityId} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'type must be operator or regulator' }, { status: 400 });
}
