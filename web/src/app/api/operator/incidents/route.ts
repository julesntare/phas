import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireOperatorAuth } from '@/lib/operator-auth';

export async function GET(req: NextRequest) {
  let op;
  try {
    op = await requireOperatorAuth(req.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const incidents = await sql<{
    id: string; state: string; opened_at: Date; closed_at: Date | null;
    confidence: number; recurrence_count: number;
    platform_name: string; cosign_count: string; comment_count: string;
  }[]>`
    SELECT
      i.id, i.state, i.opened_at, i.closed_at, i.confidence, i.recurrence_count,
      p.name AS platform_name,
      COUNT(DISTINCT r.id) FILTER (WHERE r.incident_id = i.id) AS cosign_count,
      COUNT(DISTINCT c.id) AS comment_count
    FROM incidents i
    JOIN platforms p ON p.id = i.platform_id
    LEFT JOIN reports r ON r.incident_id = i.id
    LEFT JOIN incident_comments c ON c.incident_id = i.id
    WHERE i.platform_id = ${op.platformId}
      AND i.state <> 'resolved'
    GROUP BY i.id, p.name
    ORDER BY i.opened_at DESC
  `;

  return NextResponse.json(incidents);
}
