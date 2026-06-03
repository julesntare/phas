import sql from './lib/db';
import { runFusionForPlatform } from './fusion';

interface Platform {
  id: string;
  name: string;
  base_url: string;
}

// Runs an HTTP ping against every platform and stores the result.
// Called by the cron scheduler in index.ts.
export async function probeAllPlatforms(): Promise<void> {
  const platforms = await sql<Platform[]>`SELECT id, name, base_url FROM platforms`;
  console.log(`[prober] probing ${platforms.length} platforms`);

  await Promise.allSettled(platforms.map(probePlatform));
}

async function probePlatform(platform: Platform): Promise<void> {
  const start = Date.now();
  let ok = false;
  let statusCode: number | null = null;

  try {
    const res = await fetch(platform.base_url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    ok = res.ok;
  } catch {
    ok = false;
  }

  const latencyMs = Date.now() - start;

  await sql`
    INSERT INTO probe_results (platform_id, check_type, status_code, ok, latency_ms)
    VALUES (${platform.id}, 'http_ping', ${statusCode}, ${ok}, ${latencyMs})
  `;

  console.log(`[prober] ${platform.name} → ${ok ? 'OK' : 'FAIL'} ${statusCode ?? 'timeout'} (${latencyMs}ms)`);

  await runFusionForPlatform(platform.id);
}
