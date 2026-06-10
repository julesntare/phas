import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const incidents = await sql<{
    id: string; state: string; opened_at: Date; closed_at: Date | null;
    recurrence_count: number; confidence: number; event_count: string;
  }[]>`
    SELECT
      i.id, i.state, i.opened_at, i.closed_at,
      i.recurrence_count, i.confidence,
      COUNT(e.id) AS event_count
    FROM incidents i
    LEFT JOIN incident_events e ON e.incident_id = i.id
    WHERE i.platform_id = ${id}
    GROUP BY i.id
    ORDER BY i.opened_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ incidents });
}
