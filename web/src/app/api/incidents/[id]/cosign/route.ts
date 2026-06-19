import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/auth';
import { verifyAnyToken, isCitizenToken } from '@/lib/auth';
import { runFusionForPlatform } from '@/lib/fusion';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Resolve identity: NextAuth session (web Google) or Bearer JWT (mobile).
  let userId: string | null = null;
  let citizenId: string | null = null;

  const session = await auth();
  if (session?.user) {
    citizenId = session.user.id || null;
    if (!citizenId && session.user.email) {
      const [c] = await sql<{ id: string }[]>`
        SELECT id FROM citizen_accounts WHERE email = ${session.user.email}
      `;
      citizenId = c?.id ?? null;
    }
  }

  if (!citizenId) {
    const h = req.headers.get('authorization');
    if (h?.startsWith('Bearer ')) {
      try {
        const payload = await verifyAnyToken(h.slice(7));
        if (isCitizenToken(payload)) citizenId = payload.sub;
        else userId = payload.sub;
      } catch { /* ignore */ }
    }
  }

  if (!userId && !citizenId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [incident] = await sql<{ id: string; platform_id: string; state: string }[]>`
    SELECT id, platform_id, state FROM incidents WHERE id = ${id}
  `;
  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }
  if (incident.state === 'resolved') {
    return NextResponse.json({ error: 'Incident is already resolved' }, { status: 409 });
  }

  // Idempotent — one cosign per user/citizen per incident.
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM reports
    WHERE incident_id = ${id}
      AND (
        (${userId}::uuid IS NOT NULL AND user_id     = ${userId}::uuid)
        OR
        (${citizenId}::uuid IS NOT NULL AND reporter_id = ${citizenId}::uuid)
      )
    LIMIT 1
  `;
  if (existing) {
    return NextResponse.json({ alreadyCosigned: true, id: existing.id });
  }

  const body = await req.json().catch(() => ({}));
  const { freeText, district, latitude, longitude } = body ?? {};

  const [report] = await sql<{ id: string }[]>`
    INSERT INTO reports (
      platform_id, user_id, reporter_id, type, incident_id,
      free_text, district, latitude, longitude, is_anonymous
    ) VALUES (
      ${incident.platform_id}, ${userId ?? null}, ${citizenId ?? null},
      'affected', ${id},
      ${freeText ?? null}, ${district ?? null},
      ${latitude ?? null}, ${longitude ?? null},
      ${citizenId ? false : true}
    )
    RETURNING id
  `;

  runFusionForPlatform(incident.platform_id).catch(console.error);

  return NextResponse.json({ id: report.id }, { status: 201 });
}
