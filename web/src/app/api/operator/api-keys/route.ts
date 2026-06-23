import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import sql from '@/lib/db';
import { requireOperatorAuth, hashToken } from '@/lib/operator-auth';

// GET /api/operator/api-keys — list keys (label + metadata, never the raw key).
export async function GET(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await sql<{
    id: string; label: string; created_at: string; last_used_at: string | null;
  }[]>`
    SELECT id, label, created_at, last_used_at
    FROM platform_api_keys
    WHERE platform_id = ${op.platformId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json(keys);
}

// POST /api/operator/api-keys — generate a new key.
// Returns the raw key once — it cannot be retrieved again.
export async function POST(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const label: string = (body?.label ?? '').trim();
  if (!label) {
    return NextResponse.json({ error: 'label required' }, { status: 400 });
  }

  const rawKey = `phas_${randomBytes(24).toString('hex')}`;
  const hash = hashToken(rawKey);

  const [row] = await sql<{ id: string; created_at: string }[]>`
    INSERT INTO platform_api_keys (platform_id, key_hash, label)
    VALUES (${op.platformId}, ${hash}, ${label})
    RETURNING id, created_at
  `;

  return NextResponse.json({ id: row.id, label, key: rawKey, created_at: row.created_at }, { status: 201 });
}
