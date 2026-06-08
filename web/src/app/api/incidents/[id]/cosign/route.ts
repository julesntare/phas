import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { runFusionForPlatform } from '@/lib/fusion';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let user;
  try {
    user = await requireAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify incident exists and is still open.
  const [incident] = await sql<{ id: string; platform_id: string; state: string }[]>`
    SELECT id, platform_id, state FROM incidents WHERE id = ${id}
  `;
  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }
  if (incident.state === 'resolved') {
    return NextResponse.json({ error: 'Incident is already resolved' }, { status: 409 });
  }

  // Idempotent — one cosign per user per incident.
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM reports WHERE incident_id = ${id} AND user_id = ${user.sub}
  `;
  if (existing) {
    return NextResponse.json({ alreadyCosigned: true, id: existing.id });
  }

  const body = await req.json().catch(() => ({}));
  const { freeText, district, latitude, longitude } = body ?? {};

  const [report] = await sql<{ id: string }[]>`
    INSERT INTO reports (platform_id, user_id, type, incident_id, free_text, district, latitude, longitude)
    VALUES (
      ${incident.platform_id}, ${user.sub}, 'affected', ${id},
      ${freeText ?? null}, ${district ?? null},
      ${latitude ?? null}, ${longitude ?? null}
    )
    RETURNING id
  `;

  runFusionForPlatform(incident.platform_id).catch(console.error);

  return NextResponse.json({ id: report.id }, { status: 201 });
}
