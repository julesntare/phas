import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(
      req.headers.get('authorization'),
      req.headers.get('x-api-key'),
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await sql<{
    id: string;
    title: string;
    body: string;
    category: string;
    status: string;
    upvotes: number;
    admin_note: string | null;
    operator_note: string | null;
    created_at: Date;
  }[]>`
    SELECT id, title, body, category, status, upvotes, admin_note, operator_note, created_at
    FROM suggestions
    WHERE platform_id = ${op.platformId}
      AND status IN ('forwarded', 'acknowledged', 'planned', 'declined')
    ORDER BY upvotes DESC, created_at DESC
  `;

  return NextResponse.json({ suggestions: rows });
}
