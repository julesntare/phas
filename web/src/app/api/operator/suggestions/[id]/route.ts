import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

const OPERATOR_RESPONSES = new Set(['acknowledged', 'planned', 'declined']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let op;
  try {
    op = await requireOperatorAuth(
      req.headers.get('authorization'),
      req.headers.get('x-api-key'),
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { status, operatorNote } = body ?? {};

  if (!status || !OPERATOR_RESPONSES.has(status)) {
    return NextResponse.json(
      { error: 'status must be acknowledged | planned | declined' },
      { status: 400 },
    );
  }

  const [suggestion] = await sql<{ id: string; status: string; platform_id: string }[]>`
    SELECT id, status, platform_id FROM suggestions WHERE id = ${id}
  `;
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  if (suggestion.platform_id !== op.platformId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (suggestion.status !== 'forwarded') {
    return NextResponse.json({ error: 'Suggestion must be in forwarded state' }, { status: 422 });
  }

  await sql`
    UPDATE suggestions
    SET status        = ${status},
        operator_note = COALESCE(${operatorNote ?? null}, operator_note),
        updated_at    = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, status });
}
