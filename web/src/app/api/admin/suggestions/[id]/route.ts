import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { sendSuggestionForwarded } from '@/lib/mailer';

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  pending:    ['public', 'dismissed'],
  public:     ['dismissed', 'forwarded'],
  dismissed:  ['public'],
  forwarded:  [],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { requireAdminAuth(req); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { status, adminNote } = body ?? {};

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  const [suggestion] = await sql<{
    id: string;
    status: string;
    title: string;
    body: string;
    category: string;
    platform_id: string;
    platform_name: string;
    contact_email: string | null;
  }[]>`
    SELECT s.id, s.status, s.title, s.body, s.category, s.platform_id,
           p.name AS platform_name, p.contact_email
    FROM suggestions s
    JOIN platforms p ON p.id = s.platform_id
    WHERE s.id = ${id}
  `;
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });

  const allowed = ADMIN_TRANSITIONS[suggestion.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from '${suggestion.status}' to '${status}'` },
      { status: 422 },
    );
  }

  const resolvedNote = adminNote ?? null;

  await sql`
    UPDATE suggestions
    SET status     = ${status},
        admin_note = COALESCE(${resolvedNote}, admin_note),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  if (status === 'forwarded') {
    // SUGGESTION_FORWARD_EMAIL_OVERRIDE lets you receive the email yourself during testing.
    const recipient =
      process.env.SUGGESTION_FORWARD_EMAIL_OVERRIDE ?? suggestion.contact_email;

    if (recipient) {
      await sendSuggestionForwarded({
        to:              [recipient],
        platformName:    suggestion.platform_name,
        suggestionTitle: suggestion.title,
        suggestionBody:  suggestion.body,
        category:        suggestion.category,
        adminNote:       resolvedNote,
        suggestionId:    id,
      }).catch(err => console.error('[suggestions] forward email failed:', err));
    }
  }

  return NextResponse.json({ ok: true, status });
}
