import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  pending:    ['public', 'dismissed'],
  public:     ['dismissed', 'forwarded'],
  dismissed:  ['public'],
  forwarded:  [],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { requireAdminAuth(req); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { status, adminNote } = body ?? {};

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  const [suggestion] = await sql<{ id: string; status: string; platform_id: string }[]>`
    SELECT id, status, platform_id FROM suggestions WHERE id = ${id}
  `;
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });

  const allowed = ADMIN_TRANSITIONS[suggestion.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from '${suggestion.status}' to '${status}'` },
      { status: 422 },
    );
  }

  await sql`
    UPDATE suggestions
    SET status     = ${status},
        admin_note = COALESCE(${adminNote ?? null}, admin_note),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, status });
}
