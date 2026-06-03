import postgres from 'postgres';

// prepare: false is required for PgBouncer transaction-mode pooling.
// Set DATABASE_URL=...?pgbouncer=true&connection_limit=1 on Render.
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

export default sql;
