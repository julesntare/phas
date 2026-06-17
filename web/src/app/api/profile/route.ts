import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyAnyToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isCitizenToken(payload)) {
    const [row] = await sql<{
      id: string; email: string; name: string; avatar_url: string | null;
    }[]>`
      SELECT id, email, name, avatar_url FROM citizen_accounts WHERE id = ${payload.sub}
    `;
    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      district: null,
      authType: 'google',
    });
  }

  const [row] = await sql<{
    id: string; phone: string; district: string | null; name: string | null;
  }[]>`
    SELECT id, phone, district, name FROM users WHERE id = ${payload.sub}
  `;
  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({
    id: row.id,
    phone: row.phone,
    district: row.district,
    name: row.name,
    authType: 'phone',
  });
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyAnyToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name: string | null = body?.name ? String(body.name).trim().slice(0, 80) : null;

  if (isCitizenToken(payload)) {
    if (name !== null) {
      await sql`UPDATE citizen_accounts SET name = ${name} WHERE id = ${payload.sub}`;
    }
    return NextResponse.json({ ok: true });
  }

  const district: string | null = body?.district ?? null;
  await sql`UPDATE users SET district = ${district}, name = ${name} WHERE id = ${payload.sub}`;
  return NextResponse.json({ ok: true });
}
