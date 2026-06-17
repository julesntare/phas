import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAnyToken } from '@/lib/auth';

// GET /api/subscriptions — returns platform IDs the authenticated user follows.
export async function GET(req: NextRequest) {
  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await sql<{ platform_id: string }[]>`
    SELECT platform_id FROM subscriptions WHERE user_id = ${user.sub}
  `;

  return NextResponse.json({ platformIds: rows.map((r) => r.platform_id) });
}

// POST /api/subscriptions — follow a platform.
export async function POST(req: NextRequest) {
  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const platformId: string = body?.platformId ?? '';

  if (!platformId) {
    return NextResponse.json({ error: 'platformId required' }, { status: 400 });
  }

  const [platform] = await sql<{ id: string }[]>`
    SELECT id FROM platforms WHERE id = ${platformId}
  `;
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  const [sub] = await sql<{ id: string }[]>`
    INSERT INTO subscriptions (user_id, platform_id)
    VALUES (${user.sub}, ${platformId})
    ON CONFLICT (user_id, platform_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING id
  `;

  return NextResponse.json({ id: sub.id }, { status: 201 });
}
