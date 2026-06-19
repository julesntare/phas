import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let operator;
  try { operator = await requireOperatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { id } = await params;
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

  const result = await sql`
    UPDATE maintenance_windows
    SET title       = ${title},
        description = ${description || null},
        starts_at   = ${start.toISOString()},
        ends_at     = ${end.toISOString()}
    WHERE id = ${id} AND platform_id = ${operator.platformId}
  `;

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ updated: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let operator;
  try { operator = await requireOperatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { id } = await params;

  const result = await sql`
    DELETE FROM maintenance_windows
    WHERE id = ${id} AND platform_id = ${operator.platformId}
  `;

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
