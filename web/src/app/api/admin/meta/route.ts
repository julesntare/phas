import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [platforms, authorities] = await Promise.all([
    sql<{ id: string; name: string; authority_name: string }[]>`
      SELECT p.id, p.name, a.name AS authority_name
      FROM platforms p JOIN authorities a ON a.id = p.authority_id
      ORDER BY p.name
    `,
    sql<{ id: string; name: string }[]>`
      SELECT id, name FROM authorities ORDER BY name
    `,
  ]);

  return NextResponse.json({ platforms, authorities });
}
