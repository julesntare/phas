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

const PUBLIC_STATUSES = ['public', 'forwarded', 'acknowledged', 'planned', 'declined'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveIdentity(req);
  if (!identity) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const voteType: 'up' | 'down' = body?.voteType === 'down' ? 'down' : 'up';
  const rawComment = typeof body?.comment === 'string' ? body.comment.trim() : '';
  const comment = rawComment.length > 0 ? rawComment.slice(0, 200) : null;

  const [suggestion] = await sql<{ id: string; status: string }[]>`
    SELECT id, status FROM suggestions WHERE id = ${id}
  `;
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  if (!PUBLIC_STATUSES.includes(suggestion.status)) {
    return NextResponse.json({ error: 'Suggestion is not public' }, { status: 403 });
  }

  const [existing] = await sql<{ vote_type: string }[]>`
    SELECT vote_type FROM suggestion_upvotes
    WHERE suggestion_id = ${id}
      AND (
        (${identity.citizenId ?? null}::uuid IS NOT NULL AND reporter_id = ${identity.citizenId ?? null}::uuid)
        OR
        (${identity.userId ?? null}::uuid IS NOT NULL AND user_id = ${identity.userId ?? null}::uuid)
      )
  `;

  const newVal = voteType === 'up' ? 1 : -1;
  const oldVal = existing ? (existing.vote_type === 'up' ? 1 : -1) : 0;
  const delta  = newVal - oldVal;

  if (existing) {
    await sql`
      UPDATE suggestion_upvotes
      SET vote_type = ${voteType}, comment = ${comment}
      WHERE suggestion_id = ${id}
        AND (
          (${identity.citizenId ?? null}::uuid IS NOT NULL AND reporter_id = ${identity.citizenId ?? null}::uuid)
          OR
          (${identity.userId ?? null}::uuid IS NOT NULL AND user_id = ${identity.userId ?? null}::uuid)
        )
    `;
  } else {
    await sql`
      INSERT INTO suggestion_upvotes (suggestion_id, reporter_id, user_id, vote_type, comment)
      VALUES (${id}, ${identity.citizenId ?? null}, ${identity.userId ?? null}, ${voteType}, ${comment})
    `;
  }

  if (delta !== 0) {
    await sql`UPDATE suggestions SET upvotes = upvotes + ${delta}, updated_at = NOW() WHERE id = ${id}`;
  }

  const [updated] = await sql<{ upvotes: number }[]>`SELECT upvotes FROM suggestions WHERE id = ${id}`;
  return NextResponse.json({ ok: true, upvotes: updated.upvotes });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveIdentity(req);
  if (!identity) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { id } = await params;

  const [deleted] = await sql<{ vote_type: string }[]>`
    DELETE FROM suggestion_upvotes
    WHERE suggestion_id = ${id}
      AND (
        (${identity.citizenId ?? null}::uuid IS NOT NULL AND reporter_id = ${identity.citizenId ?? null}::uuid)
        OR
        (${identity.userId ?? null}::uuid IS NOT NULL AND user_id = ${identity.userId ?? null}::uuid)
      )
    RETURNING vote_type
  `;

  if (!deleted) return NextResponse.json({ error: 'Vote not found' }, { status: 404 });

  const delta = deleted.vote_type === 'up' ? -1 : 1;
  await sql`UPDATE suggestions SET upvotes = upvotes + ${delta}, updated_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
