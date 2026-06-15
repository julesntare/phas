import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import sql from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isRateLimited, isAnonRateLimited } from '@/lib/rate-limit';
import { runFusionForPlatform } from '@/lib/fusion';

const VALID_TYPES = new Set(['affected', 'ok']);

function getIpKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  return createHash('sha256').update(ip).digest('hex');
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const u = await requireAuth(req.headers.get('authorization'));
    userId = u.sub;
  } catch {
    // anonymous — proceed without userId
  }

  if (userId) {
    if (await isRateLimited(userId, 1, 10)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  } else {
    // 5 anonymous reports per IP per hour
    if (isAnonRateLimited(getIpKey(req), 60 * 60 * 1000, 5)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }

  const body = await req.json().catch(() => null);
  const { platformId, type, district, sector, cell, village,
          latitude, longitude, freeText, proofImageUrl } = body ?? {};

  if (!platformId || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'platformId and type (affected|ok) required' }, { status: 400 });
  }

  const [platform] = await sql<{ id: string }[]>`
    SELECT id FROM platforms WHERE id = ${platformId}
  `;
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  const [report] = await sql<{ id: string }[]>`
    INSERT INTO reports (
      platform_id, user_id, type,
      district, sector, cell, village,
      latitude, longitude,
      free_text, proof_image_url
    ) VALUES (
      ${platformId}, ${userId ?? null}, ${type},
      ${district ?? null}, ${sector ?? null}, ${cell ?? null}, ${village ?? null},
      ${latitude ?? null}, ${longitude ?? null},
      ${freeText ?? null}, ${proofImageUrl ?? null}
    )
    RETURNING id
  `;

  if (type === 'affected') {
    await runFusionForPlatform(platformId).catch(console.error);
    const [incident] = await sql<{ id: string }[]>`
      SELECT id FROM incidents
      WHERE platform_id = ${platformId} AND state <> 'resolved'
      ORDER BY opened_at DESC LIMIT 1
    `;
    if (incident) {
      await sql`UPDATE reports SET incident_id = ${incident.id} WHERE id = ${report.id}`;
    }
    return NextResponse.json(
      { id: report.id, incidentId: incident?.id ?? null },
      { status: 201 },
    );
  }

  runFusionForPlatform(platformId).catch(console.error);
  return NextResponse.json({ id: report.id }, { status: 201 });
}
