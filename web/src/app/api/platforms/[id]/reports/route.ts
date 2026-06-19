import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const reports = await sql<{
    id: string;
    type: string;
    created_at: string;
    district: string | null;
    free_text: string | null;
    is_anonymous: boolean;
    reporter_name: string | null;
  }[]>`
    SELECT r.id, r.type, r.created_at, r.district, r.free_text, r.is_anonymous,
           CASE WHEN r.is_anonymous THEN NULL ELSE ca.name END AS reporter_name
    FROM reports r
    LEFT JOIN citizen_accounts ca ON ca.id = r.reporter_id
    WHERE r.platform_id = ${id}
      AND r.created_at > NOW() - INTERVAL '48 hours'
    ORDER BY r.created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({ reports });
}
