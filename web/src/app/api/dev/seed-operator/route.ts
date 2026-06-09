import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/operator-auth';

export async function POST(req: NextRequest) {
  if (!process.env.SEED_ENABLED) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const platformId: string = body?.platformId ?? '';
  const email = 'operator@phas.test';
  const password = 'test1234';

  let pid = platformId;
  if (!pid) {
    const [first] = await sql<{ id: string }[]>`SELECT id FROM platforms LIMIT 1`;
    if (!first) return NextResponse.json({ error: 'No platforms found' }, { status: 400 });
    pid = first.id;
  }

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM help_desk_accounts WHERE email = ${email}
  `;

  if (existing) {
    await sql`
      UPDATE help_desk_accounts
      SET password_hash = ${hashPassword(password)}, platform_id = ${pid}
      WHERE id = ${existing.id}
    `;
    return NextResponse.json({ email, password, platformId: pid, created: false });
  }

  await sql`
    INSERT INTO help_desk_accounts (platform_id, email, name, password_hash)
    VALUES (${pid}, ${email}, ${'Test Operator'}, ${hashPassword(password)})
  `;

  return NextResponse.json({ email, password, platformId: pid, created: true });
}
