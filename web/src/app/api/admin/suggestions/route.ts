import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status     = searchParams.get('status');
  const platformId = searchParams.get('platform_id');
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const offset     = Number(searchParams.get('offset') ?? 0);

  const rows = await sql<{
    id: string;
    platform_id: string;
    platform_name: string;
    reporter_name: string | null;
    title: string;
    body: string;
    category: string;
    status: string;
    upvotes: number;
    admin_note: string | null;
    operator_note: string | null;
    created_at: Date;
  }[]>`
    SELECT
      s.id, s.platform_id, p.name AS platform_name,
      ca.name AS reporter_name,
      s.title, s.body, s.category, s.status, s.upvotes,
      s.admin_note, s.operator_note, s.created_at
    FROM suggestions s
    JOIN platforms p ON p.id = s.platform_id
    LEFT JOIN citizen_accounts ca ON ca.id = s.reporter_id
    WHERE (${status}::text      IS NULL OR s.status      = ${status}::text)
      AND (${platformId}::uuid  IS NULL OR s.platform_id = ${platformId}::uuid)
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return NextResponse.json({ suggestions: rows });
}
