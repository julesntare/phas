import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/auth';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';
import { isRateLimited } from '@/lib/rate-limit';

const VALID_CATEGORIES = new Set(['feature', 'improvement', 'other']);
const PUBLIC_STATUSES = ['public', 'forwarded', 'acknowledged', 'planned', 'declined'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformId = searchParams.get('platform_id');
  if (!platformId) {
    return NextResponse.json({ error: 'platform_id required' }, { status: 400 });
  }

  // Resolve caller identity to flag their own upvotes.
  let citizenId: string | null = null;
  let userId: string | null = null;
  const session = await auth();
  if (session?.user) {
    citizenId = session.user.id || null;
    if (!citizenId && session.user.email) {
      const [c] = await sql<{ id: string }[]>`
        SELECT id FROM citizen_accounts WHERE email = ${session.user.email}
      `;
      citizenId = c?.id ?? null;
    }
  } else {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await verifyAnyToken(authHeader.slice(7));
        if (isCitizenToken(payload)) citizenId = payload.sub;
        else userId = payload.sub;
      } catch { /* unauthenticated — still return public suggestions */ }
    }
  }

  const rows = await sql<{
    id: string;
    title: string;
    body: string;
    category: string;
    status: string;
    upvotes: number;
    created_at: Date;
    user_vote: string | null;
    user_comment: string | null;
  }[]>`
    SELECT
      s.id, s.title, s.body, s.category, s.status, s.upvotes, s.created_at,
      (SELECT u.vote_type FROM suggestion_upvotes u
       WHERE u.suggestion_id = s.id
         AND (
           (${citizenId}::uuid IS NOT NULL AND u.reporter_id = ${citizenId}::uuid)
           OR
           (${userId}::uuid IS NOT NULL AND u.user_id = ${userId}::uuid)
         )
       LIMIT 1) AS user_vote,
      (SELECT u.comment FROM suggestion_upvotes u
       WHERE u.suggestion_id = s.id
         AND (
           (${citizenId}::uuid IS NOT NULL AND u.reporter_id = ${citizenId}::uuid)
           OR
           (${userId}::uuid IS NOT NULL AND u.user_id = ${userId}::uuid)
         )
       LIMIT 1) AS user_comment
    FROM suggestions s
    WHERE s.platform_id = ${platformId}
      AND s.status = ANY(${PUBLIC_STATUSES}::text[])
    ORDER BY s.upvotes DESC, s.created_at DESC
  `;

  return NextResponse.json({ suggestions: rows });
}

export async function POST(req: NextRequest) {
  let citizenId: string | null = null;
  let userId: string | null = null;

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
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await verifyAnyToken(authHeader.slice(7));
        if (isCitizenToken(payload)) citizenId = payload.sub;
        else userId = payload.sub;
      } catch {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
  }

  const rlKey = citizenId ?? userId!;
  if (await isRateLimited(rlKey, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const { platformId, title, body: text, category = 'improvement' } = body ?? {};

  if (!platformId || !title?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'platformId, title, and body required' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'category must be feature | improvement | other' }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: 'title must be 120 characters or fewer' }, { status: 400 });
  }

  const [platform] = await sql<{ id: string }[]>`SELECT id FROM platforms WHERE id = ${platformId}`;
  if (!platform) return NextResponse.json({ error: 'Platform not found' }, { status: 404 });

  const [suggestion] = await sql<{ id: string }[]>`
    INSERT INTO suggestions (platform_id, reporter_id, user_id, title, body, category)
    VALUES (${platformId}, ${citizenId ?? null}, ${userId ?? null}, ${title.trim()}, ${text.trim()}, ${category})
    RETURNING id
  `;

  return NextResponse.json({ id: suggestion.id }, { status: 201 });
}
