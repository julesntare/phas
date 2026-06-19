import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

// DELETE /api/subscriptions/:platformId — unfollow a platform.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ platformId: string }> },
) {
  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platformId } = await params;

  if (isCitizenToken(user)) {
    await sql`
      DELETE FROM subscriptions
      WHERE citizen_id = ${user.sub} AND platform_id = ${platformId}
    `;
  } else {
    await sql`
      DELETE FROM subscriptions
      WHERE user_id = ${user.sub} AND platform_id = ${platformId}
    `;
  }

  return NextResponse.json({ success: true });
}
