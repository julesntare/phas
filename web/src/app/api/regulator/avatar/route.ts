import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sql from '@/lib/db';
import { requireRegulatorAuth } from '@/lib/regulator-auth';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let reg;
  try { reg = await requireRegulatorAuth(req.headers.get('authorization')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only jpg, png, webp allowed' }, { status: 400 });
  }

  const blob = await put(`avatars/regulators/${reg.sub}/${Date.now()}.${ext}`, file, { access: 'public' });
  await sql`UPDATE regulator_accounts SET avatar_url = ${blob.url} WHERE id = ${reg.sub}`;
  return NextResponse.json({ url: blob.url });
}
