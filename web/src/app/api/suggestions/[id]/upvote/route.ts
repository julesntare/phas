import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/auth';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

async function resolveIdentity(req: NextRequest): Promise<
  { citizenId: string; userId: null } | { citizenId: null; userId: string } | null
> {
  const session = await auth();
  if (session?.user) {
    let citizenId = session.user.id || null;
    if (!citizenId && session.user.email) {
      const [c] = await sql<{ id: string }[]>`
        SELECT id FROM citizen_accounts WHERE email = ${session.user.email}
      `;
      citizenId = c?.id ?? null;
    }
    if (citizenId) return { citizenId, userId: null };
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = await verifyAnyToken(authHeader.slice(7));
      if (isCitizenToken(payload)) return { citizenId: payload.sub, userId: null };
      return { citizenId: null, userId: payload.sub };
    } catch { /* fall through */ }
  }

  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveIdentity(req);
  if (!identity) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await params;

  const [suggestion] = await sql<{ id: string; status: string }[]>`
    SELECT id, status FROM suggestions WHERE id = ${id}
  `;
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  if (!['public', 'forwarded', 'acknowledged', 'planned', 'declined'].includes(suggestion.status)) {
    return NextResponse.json({ error: 'Suggestion is not public' }, { status: 403 });
  }

  try {
    await sql`
      INSERT INTO suggestion_upvotes (suggestion_id, reporter_id, user_id)
      VALUES (${id}, ${identity.citizenId ?? null}, ${identity.userId ?? null})
    `;
    await sql`UPDATE suggestions SET upvotes = upvotes + 1, updated_at = NOW() WHERE id = ${id}`;
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveIdentity(req);
  if (!identity) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await params;

  const result = await sql`
    DELETE FROM suggestion_upvotes
    WHERE suggestion_id = ${id}
      AND (
        (${identity.citizenId ?? null}::uuid IS NOT NULL AND reporter_id = ${identity.citizenId ?? null}::uuid)
        OR
        (${identity.userId ?? null}::uuid IS NOT NULL AND user_id = ${identity.userId ?? null}::uuid)
      )
  `;

  if (result.count === 0) return NextResponse.json({ error: 'Upvote not found' }, { status: 404 });

  await sql`UPDATE suggestions SET upvotes = GREATEST(upvotes - 1, 0), updated_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
