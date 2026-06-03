import sql from '@/lib/db';

// Public status page — no auth required.
// Revalidates every 60 seconds (ISR).
export const revalidate = 60;

interface PlatformRow {
  id: string;
  name: string;
  category: string;
  authority_name: string;
  state: string | null;
  opened_at: string | null;
}

const STATE_LABEL: Record<string, string> = {
  detected:           'Investigating',
  confirmed:          'Confirmed issue',
  acknowledged:       'Acknowledged',
  partially_resolved: 'Partially resolved',
  recurred:           'Recurred',
};

const STATE_COLOR: Record<string, string> = {
  detected:           '#f59e0b',
  confirmed:          '#ef4444',
  acknowledged:       '#f97316',
  partially_resolved: '#a78bfa',
  recurred:           '#dc2626',
};

export default async function StatusPage() {
  const platforms = await sql<PlatformRow[]>`
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

  const issues = platforms.filter((p) => p.state !== null);
  const operational = platforms.filter((p) => p.state === null);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>System Status</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Last updated: {new Date().toUTCString()}
      </p>

      {issues.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#ef4444' }}>
            Active issues ({issues.length})
          </h2>
          {issues.map((p) => (
            <PlatformCard key={p.id} platform={p} />
          ))}
        </section>
      )}

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#16a34a' }}>
          Operational ({operational.length})
        </h2>
        {operational.map((p) => (
          <PlatformCard key={p.id} platform={p} />
        ))}
      </section>
    </main>
  );
}

function PlatformCard({ platform: p }: { platform: PlatformRow }) {
  const hasIssue = p.state !== null;
  const label = hasIssue ? STATE_LABEL[p.state!] ?? p.state : 'Operational';
  const color = hasIssue ? STATE_COLOR[p.state!] ?? '#6b7280' : '#16a34a';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        background: '#fff',
      }}
    >
      <div>
        <span style={{ fontWeight: 500 }}>{p.name}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
          {p.authority_name} · {p.category}
        </span>
      </div>
      <span style={{ color, fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
