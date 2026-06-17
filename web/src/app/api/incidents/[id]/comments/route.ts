import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
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
    created_at: string;
  }[]>`
    SELECT id, content, district, created_at
    FROM incident_comments
    WHERE incident_id = ${id}
    ORDER BY created_at ASC
    LIMIT 100
  `;

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
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

  // Verify incident exists (silently reject comments on non-existent incidents).
  const [incident] = await sql<{ id: string }[]>`
    SELECT id FROM incidents WHERE id = ${id}
  `;
  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  // Copy user's district for anonymous display (Google users have no district).
  let district: string | null = null;
  if (!isCitizenToken(user)) {
    const [userRow] = await sql<{ district: string | null }[]>`
      SELECT district FROM users WHERE id = ${user.sub}
    `;
    district = userRow?.district ?? null;
  }

  const [comment] = await sql<{ id: string; created_at: string }[]>`
    INSERT INTO incident_comments (incident_id, user_id, content, district)
    VALUES (${id}, ${user.sub}, ${content}, ${district})
    RETURNING id, created_at
  `;

  return NextResponse.json(
    { id: comment.id, content, district, created_at: comment.created_at },
    { status: 201 },
  );
}
