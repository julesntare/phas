import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isRateLimited } from '@/lib/rate-limit';
import { runFusionForPlatform } from '@/lib/fusion';

const VALID_TYPES = new Set(['affected', 'ok']);

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 10 reports per user per hour.
  if (await isRateLimited(user.sub, 1, 10)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const { platformId, type, district, freeText } = body ?? {};

  if (!platformId || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'platformId and type (affected|ok) required' }, { status: 400 });
  }

  // Verify platform exists.
  const [platform] = await sql<{ id: string }[]>`
    SELECT id FROM platforms WHERE id = ${platformId}
  `;
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  const [report] = await sql<{ id: string }[]>`
    INSERT INTO reports (platform_id, user_id, type, district, free_text)
    VALUES (${platformId}, ${user.sub}, ${type}, ${district ?? null}, ${freeText ?? null})
    RETURNING id
  `;

  // Fusion runs async — do not await on the request path.
  runFusionForPlatform(platformId).catch(console.error);

  return NextResponse.json({ id: report.id }, { status: 201 });
}
