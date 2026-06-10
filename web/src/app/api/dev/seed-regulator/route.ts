import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/operator-auth';

export async function POST(_req: NextRequest) {
  if (!process.env.SEED_ENABLED) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const email = 'regulator@phas.test';
  const password = 'test1234';

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM regulator_accounts WHERE email = ${email}
  `;

  const [authority] = await sql<{ id: string }[]>`SELECT id FROM authorities LIMIT 1`;
  if (!authority) {
    return NextResponse.json({ error: 'No authorities in DB — seed platforms first' }, { status: 400 });
  }

  if (existing) {
    await sql`
      UPDATE regulator_accounts
      SET password_hash = ${hashPassword(password)}, authority_id = ${authority.id}
      WHERE id = ${existing.id}
    `;
    return NextResponse.json({ email, password, created: false });
  }

  await sql`
    INSERT INTO regulator_accounts (authority_id, email, name, password_hash)
    VALUES (${authority.id}, ${email}, ${'Test Regulator'}, ${hashPassword(password)})
  `;

  return NextResponse.json({ email, password, created: true });
}
