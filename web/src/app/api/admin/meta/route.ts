import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const authorities = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM authorities ORDER BY name
  `;

  return NextResponse.json({ authorities });
}
