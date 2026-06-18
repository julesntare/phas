import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/operator-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { requireAdminAuth(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { type } = body as { type: 'platform' | 'authority' };
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });
  const { id } = await params;

  if (type === 'platform') {
    const { name, baseUrl, category, authorityId, contactEmail, contactName, webhookUrl, avatarUrl, password } = body as {
      name?: string; baseUrl?: string; category?: string; authorityId?: string;
      contactEmail?: string; contactName?: string; webhookUrl?: string;
      avatarUrl?: string; password?: string;
    };

    if (name !== undefined) await sql`UPDATE platforms SET name = ${name} WHERE id = ${id}`;
    if (baseUrl !== undefined) await sql`UPDATE platforms SET base_url = ${baseUrl} WHERE id = ${id}`;
    if (category !== undefined) await sql`UPDATE platforms SET category = ${category} WHERE id = ${id}`;
    if (authorityId !== undefined) await sql`UPDATE platforms SET authority_id = ${authorityId} WHERE id = ${id}`;
    if (contactEmail !== undefined) await sql`UPDATE platforms SET contact_email = ${contactEmail.trim().toLowerCase()} WHERE id = ${id}`;
    if (contactName !== undefined) await sql`UPDATE platforms SET contact_name = ${contactName} WHERE id = ${id}`;
    if (webhookUrl !== undefined) await sql`UPDATE platforms SET webhook_url = ${webhookUrl || null} WHERE id = ${id}`;
    if (avatarUrl !== undefined) await sql`UPDATE platforms SET avatar_url = ${avatarUrl} WHERE id = ${id}`;
    if (password) {
      if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      await sql`UPDATE platforms SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true });
  }

  if (type === 'authority') {
    const { name, remitDescription, contactEmail, contactName, avatarUrl, password } = body as {
      name?: string; remitDescription?: string; contactEmail?: string;
      contactName?: string; avatarUrl?: string; password?: string;
    };

    if (name !== undefined) await sql`UPDATE authorities SET name = ${name} WHERE id = ${id}`;
    if (remitDescription !== undefined) await sql`UPDATE authorities SET remit_description = ${remitDescription} WHERE id = ${id}`;
    if (contactEmail !== undefined) await sql`UPDATE authorities SET contact_email = ${contactEmail.trim().toLowerCase()} WHERE id = ${id}`;
    if (contactName !== undefined) await sql`UPDATE authorities SET contact_name = ${contactName} WHERE id = ${id}`;
    if (avatarUrl !== undefined) await sql`UPDATE authorities SET avatar_url = ${avatarUrl} WHERE id = ${id}`;
    if (password) {
      if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      await sql`UPDATE authorities SET password_hash = ${hashPassword(password)} WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'type must be platform or authority' }, { status: 400 });
}
