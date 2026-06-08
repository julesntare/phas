import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Guarded by SEED_ENABLED env var — set it in Vercel only while testing,
// remove it before going public.
export async function POST(req: NextRequest) {
  if (!process.env.SEED_ENABLED) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const { platformId } = body ?? {};
  if (!platformId) {
    return NextResponse.json({ error: 'platformId required' }, { status: 400 });
  }

  const [platform] = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM platforms WHERE id = ${platformId}
  `;
  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  // ── Seed mock users (idempotent) ──────────────────────────────────────────
  const mockUsers: { phone: string; district: string }[] = [
    { phone: '+250700000001', district: 'Gasabo' },
    { phone: '+250700000002', district: 'Kicukiro' },
    { phone: '+250700000003', district: 'Nyarugenge' },
    { phone: '+250700000004', district: 'Musanze' },
    { phone: '+250700000005', district: 'Huye' },
    { phone: '+250700000006', district: 'Rwamagana' },
  ];
  for (const u of mockUsers) {
    await sql`
      INSERT INTO users (phone, district)
      VALUES (${u.phone}, ${u.district})
      ON CONFLICT (phone) DO NOTHING
    `;
  }

  const userRows = await sql<{ id: string; district: string }[]>`
    SELECT id, district FROM users
    WHERE phone IN (
      '+250700000001','+250700000002','+250700000003',
      '+250700000004','+250700000005','+250700000006'
    )
  `;

  // ── Close any existing open incident first so we start fresh ──────────────
  await sql`
    UPDATE incidents
    SET state = 'resolved', closed_at = NOW() - INTERVAL '5 minutes', updated_at = NOW()
    WHERE platform_id = ${platformId} AND state <> 'resolved'
  `;

  // ── Open a new "confirmed" incident ───────────────────────────────────────
  const openedAt = new Date(Date.now() - 100 * 60 * 1000); // 100 min ago
  const [incident] = await sql<{ id: string }[]>`
    INSERT INTO incidents (platform_id, state, opened_at, updated_at, confidence)
    VALUES (${platformId}, 'confirmed', ${openedAt}, NOW(), 0.82)
    RETURNING id
  `;
  const incidentId = incident.id;

  // ── Timeline events ───────────────────────────────────────────────────────
  await sql`
    INSERT INTO incident_events (incident_id, from_state, to_state, source, at) VALUES
      (${incidentId}, NULL,        'detected',  'crowd', ${new Date(openedAt.getTime() + 1000)}),
      (${incidentId}, 'detected',  'confirmed', 'probe', ${new Date(openedAt.getTime() + 8 * 60 * 1000)})
  `;

  // ── Reports (crowd signal) — spread over the last 100 min ────────────────
  const reportMeta: { userIdx: number; type: 'affected' | 'ok'; minsAgo: number; text: string | null }[] = [
    { userIdx: 0, type: 'affected', minsAgo: 98, text: 'Cannot log in since this morning' },
    { userIdx: 1, type: 'affected', minsAgo: 85, text: 'Payment page keeps timing out' },
    { userIdx: 2, type: 'affected', minsAgo: 70, text: null },
    { userIdx: 3, type: 'affected', minsAgo: 55, text: 'App crashes on launch' },
    { userIdx: 4, type: 'ok',       minsAgo: 50, text: null },
    { userIdx: 5, type: 'affected', minsAgo: 30, text: 'Still not working for me' },
  ];

  for (const m of reportMeta) {
    const u = userRows[m.userIdx];
    if (!u) continue;
    await sql`
      INSERT INTO reports (platform_id, user_id, type, district, free_text, incident_id, created_at)
      VALUES (
        ${platformId}, ${u.id}, ${m.type}, ${u.district}, ${m.text ?? null},
        ${m.type === 'affected' ? incidentId : null},
        ${new Date(Date.now() - m.minsAgo * 60 * 1000)}
      )
    `;
  }

  // ── Additional cosigns directly linked to the incident ────────────────────
  const cosignMeta: { userIdx: number; minsAgo: number; text: string | null }[] = [
    { userIdx: 1, minsAgo: 40, text: 'Same issue in Kicukiro' },
    { userIdx: 3, minsAgo: 25, text: null },
    { userIdx: 5, minsAgo: 10, text: 'Still down as of now' },
  ];

  for (const c of cosignMeta) {
    const u = userRows[c.userIdx];
    if (!u) continue;
    // Only insert if this user hasn't already cosigned (from the loop above)
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM reports WHERE incident_id = ${incidentId} AND user_id = ${u.id}
    `;
    if (!existing) {
      await sql`
        INSERT INTO reports (platform_id, user_id, type, district, free_text, incident_id, created_at)
        VALUES (
          ${platformId}, ${u.id}, 'affected', ${u.district}, ${c.text ?? null},
          ${incidentId},
          ${new Date(Date.now() - c.minsAgo * 60 * 1000)}
        )
      `;
    }
  }

  // ── Mock comments ─────────────────────────────────────────────────────────
  const commentMeta: { userIdx: number; minsAgo: number; content: string }[] = [
    { userIdx: 0, minsAgo: 90, content: 'Anyone else having issues with the login page? Mine keeps spinning.' },
    { userIdx: 2, minsAgo: 75, content: 'Yes, same here. Tried both mobile data and WiFi.' },
    { userIdx: 4, minsAgo: 60, content: 'Working fine for me in Nyarugenge — might be specific areas.' },
    { userIdx: 1, minsAgo: 40, content: 'Still broken. I tried clearing cache but no luck.' },
    { userIdx: 3, minsAgo: 20, content: 'Just got a notification from their Twitter that they are aware and working on it.' },
    { userIdx: 5, minsAgo:  5, content: 'Down for 2 hours now. Impacting my business.' },
  ];

  for (const c of commentMeta) {
    const u = userRows[c.userIdx];
    if (!u) continue;
    await sql`
      INSERT INTO incident_comments (incident_id, user_id, content, district, created_at)
      VALUES (
        ${incidentId}, ${u.id}, ${c.content}, ${u.district},
        ${new Date(Date.now() - c.minsAgo * 60 * 1000)}
      )
    `;
  }

  return NextResponse.json({ incidentId, platformName: platform.name });
}
