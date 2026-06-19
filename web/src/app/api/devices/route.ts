import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token: string = body?.token ?? '';
  const platform: string = body?.platform ?? 'android';

  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }
  if (!['android', 'ios'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be android or ios' }, { status: 400 });
  }

  if (isCitizenToken(user)) {
    await sql`
      INSERT INTO device_tokens (citizen_id, token, platform, updated_at)
      VALUES (${user.sub}, ${token}, ${platform}, NOW())
      ON CONFLICT (token) DO UPDATE
        SET citizen_id = ${user.sub}, user_id = NULL, platform = ${platform}, updated_at = NOW()
    `;
  } else {
    await sql`
      INSERT INTO device_tokens (user_id, token, platform, updated_at)
      VALUES (${user.sub}, ${token}, ${platform}, NOW())
      ON CONFLICT (token) DO UPDATE
        SET user_id = ${user.sub}, citizen_id = NULL, platform = ${platform}, updated_at = NOW()
    `;
  }

  return NextResponse.json({ ok: true });
}

// DELETE lets the app deregister on sign-out.
export async function DELETE(req: NextRequest) {
  let user;
  try {
    const h = req.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) throw new Error();
    user = await verifyAnyToken(h.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isCitizenToken(user)) {
    await sql`DELETE FROM device_tokens WHERE citizen_id = ${user.sub}`;
  } else {
    await sql`DELETE FROM device_tokens WHERE user_id = ${user.sub}`;
  }

  return NextResponse.json({ ok: true });
}
