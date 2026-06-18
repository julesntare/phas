import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const [authorities, regulators] = await Promise.all([
    sql<{ id: string; name: string }[]>`
      SELECT id, name FROM authorities ORDER BY name
    `,
    sql<{ id: string; email: string; name: string | null }[]>`
      SELECT id, email, name FROM regulator_accounts ORDER BY email
    `,
  ]);

  return NextResponse.json({ authorities, regulators });
}
