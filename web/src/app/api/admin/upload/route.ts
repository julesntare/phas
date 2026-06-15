import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdminAuth } from '@/lib/admin-auth';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only jpg, png, webp allowed' }, { status: 400 });
  }

  const blob = await put(`avatars/admin/${Date.now()}.${ext}`, file, { access: 'public' });
  return NextResponse.json({ url: blob.url });
}
