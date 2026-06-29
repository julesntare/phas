import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/auth';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

  const rows = await sql<{
    id: string;
    platform_id: string;
    platform_name: string;
    title: string;
    body: string;
    category: string;
    status: string;
    upvotes: number;
    admin_note: string | null;
    operator_note: string | null;
    created_at: string;
  }[]>`
    SELECT s.id, s.platform_id, p.name AS platform_name,
           s.title, s.body, s.category, s.status,
           s.upvotes, s.admin_note, s.operator_note, s.created_at
    FROM suggestions s
    JOIN platforms p ON p.id = s.platform_id
    WHERE (${citizenId ?? null}::uuid IS NOT NULL AND s.reporter_id = ${citizenId ?? null}::uuid)
       OR (${userId ?? null}::uuid IS NOT NULL AND s.user_id = ${userId ?? null}::uuid)
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ suggestions: rows });
}
