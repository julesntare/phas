import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { runFusionForPlatform } from '@/lib/fusion';

// Vercel sends Authorization: Bearer <CRON_SECRET> on every cron invocation.
// The same header is used when an external service (e.g. cron-job.org) hits
// this route to work around Vercel Hobby's daily-only cron limit.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platforms = await sql<{ id: string; name: string; base_url: string }[]>`
    SELECT id, name, base_url FROM platforms
  `;

  const results = await Promise.allSettled(platforms.map(probePlatform));

  const summary = results.map((r, i) => ({
    platform: platforms[i].name,
    status: r.status,
    ...(r.status === 'rejected' ? { error: String(r.reason) } : {}),
  }));

  return NextResponse.json({ probed: platforms.length, summary });
}

async function probePlatform(p: { id: string; name: string; base_url: string }) {
  const start = Date.now();
  let ok = false;
  let statusCode: number | null = null;

  try {
    const res = await fetch(p.base_url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8_000),
    });
    statusCode = res.status;
    ok = res.ok;
  } catch {
    ok = false;
  }

  await sql`
    INSERT INTO probe_results (platform_id, check_type, status_code, ok, latency_ms)
    VALUES (${p.id}, 'http_ping', ${statusCode}, ${ok}, ${Date.now() - start})
  `;

  await runFusionForPlatform(p.id);
}
