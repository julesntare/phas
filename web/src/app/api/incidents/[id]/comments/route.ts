import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/auth';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const comments = await sql<{
    id: string;
    content: string;
    district: string | null;
    author_name: string | null;
    created_at: string;
  }[]>`
    SELECT ic.id, ic.content, ic.district, ic.created_at,
           CASE
             WHEN ic.citizen_id IS NOT NULL THEN ca.name
             ELSE NULL
           END AS author_name
    FROM incident_comments ic
    LEFT JOIN citizen_accounts ca ON ca.id = ic.citizen_id
    WHERE ic.incident_id = ${id}
    ORDER BY ic.created_at ASC
    LIMIT 100
  `;

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Resolve identity: NextAuth session (web Google) or Bearer JWT (mobile).
  let userId: string | null = null;
  let citizenId: string | null = null;
  let district: string | null = null;

  const session = await auth();
  if (session?.user) {
    citizenId = session.user.id || null;
    if (!citizenId && session.user.email) {
      const [c] = await sql<{ id: string }[]>`
        SELECT id FROM citizen_accounts WHERE email = ${session.user.email}
      `;
      citizenId = c?.id ?? null;
    }
  }

  if (!citizenId) {
    const h = req.headers.get('authorization');
    if (h?.startsWith('Bearer ')) {
      try {
        const payload = await verifyAnyToken(h.slice(7));
        if (isCitizenToken(payload)) {
          citizenId = payload.sub;
        } else {
          userId = payload.sub;
          const [userRow] = await sql<{ district: string | null }[]>`
            SELECT district FROM users WHERE id = ${userId}
          `;
          district = userRow?.district ?? null;
        }
      } catch { /* ignore */ }
    }
  }

  if (!userId && !citizenId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const content: string = (body?.content ?? '').trim();
  if (!content || content.length > 500) {
    return NextResponse.json(
      { error: 'content must be 1–500 characters' },
      { status: 400 },
    );
  }

  const [incident] = await sql<{ id: string }[]>`
    SELECT id FROM incidents WHERE id = ${id}
  `;
  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  const [comment] = await sql<{ id: string; created_at: string }[]>`
    INSERT INTO incident_comments (incident_id, user_id, citizen_id, content, district)
    VALUES (${id}, ${userId ?? null}, ${citizenId ?? null}, ${content}, ${district})
    RETURNING id, created_at
  `;

  // Fetch author name for the response.
  let authorName: string | null = null;
  if (citizenId) {
    const [ca] = await sql<{ name: string }[]>`
      SELECT name FROM citizen_accounts WHERE id = ${citizenId}
    `;
    authorName = ca?.name ?? null;
  }

  return NextResponse.json(
    { id: comment.id, content, district, author_name: authorName, created_at: comment.created_at },
    { status: 201 },
  );
}
