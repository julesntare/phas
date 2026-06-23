import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let op;
  try { op = await requireOperatorAuth(req.headers.get('authorization'), req.headers.get('x-api-key')); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const incidents = await sql<{
    id: string; opened_at: string; closed_at: string;
    recurrence_count: number; duration_hours: string; event_count: string;
  }[]>`
    SELECT
      i.id, i.opened_at::TEXT, i.closed_at::TEXT, i.recurrence_count,
      ROUND(EXTRACT(EPOCH FROM (i.closed_at - i.opened_at)) / 3600, 1)::TEXT AS duration_hours,
      COUNT(e.id)::TEXT AS event_count
    FROM incidents i
    LEFT JOIN incident_events e ON e.incident_id = i.id
    WHERE i.platform_id = ${op.platformId} AND i.state = 'resolved'
    GROUP BY i.id
    ORDER BY i.closed_at DESC
    LIMIT 30
  `;

  return NextResponse.json(
    incidents.map(r => ({
      ...r,
      duration_hours: Number(r.duration_hours),
      event_count: Number(r.event_count),
    }))
  );
}
