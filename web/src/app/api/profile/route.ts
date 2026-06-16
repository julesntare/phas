import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [row] = await sql<{ id: string; phone: string; district: string | null; name: string | null }[]>`
    SELECT id, phone, district, name FROM users WHERE id = ${user.sub}
  `;
  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ id: row.id, phone: row.phone, district: row.district, name: row.name });
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const district: string | null = body?.district ?? null;
  const name: string | null = body?.name ? String(body.name).trim().slice(0, 80) : null;

  await sql`UPDATE users SET district = ${district}, name = ${name} WHERE id = ${user.sub}`;

  return NextResponse.json({ ok: true });
}
