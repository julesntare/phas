import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// Returns all platforms with their current incident state (if any).
export async function GET() {
  const platforms = await sql<{
    id: string;
    name: string;
    category: string;
    authority_name: string;
    state: string | null;
    opened_at: string | null;
  }[]>`
    SELECT
      p.id,
      p.name,
      p.category,
      a.name AS authority_name,
      i.state,
      i.opened_at
    FROM platforms p
    JOIN authorities a ON a.id = p.authority_id
    LEFT JOIN LATERAL (
      SELECT state, opened_at
      FROM incidents
      WHERE platform_id = p.id AND state <> 'resolved'
      ORDER BY opened_at DESC
      LIMIT 1
    ) i ON TRUE
    ORDER BY p.name
  `;

  return NextResponse.json({ platforms });
}
