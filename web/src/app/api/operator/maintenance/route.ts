import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let operator;
  try { operator = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const windows = await sql<{
    id: string; title: string; description: string | null;
    starts_at: string; ends_at: string; created_at: string;
  }[]>`
    SELECT id, title, description, starts_at, ends_at, created_at
    FROM maintenance_windows
    WHERE platform_id = ${operator.platformId}
      AND ends_at > NOW() - INTERVAL '7 days'
    ORDER BY starts_at ASC
  `;

  return NextResponse.json(windows);
}

export async function POST(req: NextRequest) {
  let operator;
  try { operator = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  const title: string       = (body?.title ?? '').trim();
  const description: string = (body?.description ?? '').trim();
  const startsAt: string    = body?.starts_at ?? '';
  const endsAt: string      = body?.ends_at ?? '';

  if (!title || !startsAt || !endsAt) {
    return NextResponse.json({ error: 'title, starts_at, ends_at required' }, { status: 400 });
  }

  const start = new Date(startsAt);
  const end   = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 });
  }

  const [row] = await sql<{ id: string }[]>`
    INSERT INTO maintenance_windows (platform_id, operator_id, title, description, starts_at, ends_at)
    VALUES (
      ${operator.platformId}, ${operator.sub},
      ${title}, ${description || null},
      ${start.toISOString()}, ${end.toISOString()}
    )
    RETURNING id
  `;

  return NextResponse.json({ id: row.id }, { status: 201 });
}
