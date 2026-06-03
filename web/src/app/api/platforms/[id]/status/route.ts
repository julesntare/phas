import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [platform] = await sql<{
    id: string;
    name: string;
    base_url: string;
    category: string;
    public_support_channel: string | null;
    authority_name: string;
  }[]>`
    SELECT p.id, p.name, p.base_url, p.category, p.public_support_channel,
           a.name AS authority_name
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    WHERE p.id = ${id}
  `;

  if (!platform) {
    return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
  }

  // Current open incident, if any.
  const [incident] = await sql<{
    id: string;
    state: string;
    opened_at: string;
    recurrence_count: number;
    confidence: string | null;
  }[]>`
    SELECT id, state, opened_at, recurrence_count, confidence
    FROM incidents
    WHERE platform_id = ${id}
      AND state NOT IN ('resolved')
    ORDER BY opened_at DESC
    LIMIT 1
  `;

  // Last 5 probe results.
  const probes = await sql<{
    ok: boolean;
    latency_ms: number | null;
    status_code: number | null;
    ran_at: string;
  }[]>`
    SELECT ok, latency_ms, status_code, ran_at
    FROM probe_results
    WHERE platform_id = ${id}
    ORDER BY ran_at DESC
    LIMIT 5
  `;

  return NextResponse.json({ platform, incident: incident ?? null, recentProbes: probes });
}
