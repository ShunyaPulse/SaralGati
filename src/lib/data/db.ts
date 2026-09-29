import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech')
    ? true
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  application_name: 'saralgati-web',
  // Without these, an unreachable database makes every request hang until the
  // platform kills the connection. That showed up as a page that never renders
  // instead of an error anyone could act on, so bound the wait and let the route
  // return its 5xx. Both options are client-side: `statement_timeout` would be
  // sent as a startup parameter, which the Neon/pgBouncer pooler may reject.
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
});

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool has ended');
  });
});
