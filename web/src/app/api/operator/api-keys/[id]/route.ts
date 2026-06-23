import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

// DELETE /api/operator/api-keys/:id — revoke a key.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const result = await sql`
    DELETE FROM platform_api_keys
    WHERE id = ${id} AND platform_id = ${op.platformId}
  `;

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ revoked: true });
}
