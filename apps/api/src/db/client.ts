import { Pool } from 'pg';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Logger } from 'pino';
import * as schema from './schema/index.js';

// Node's 250 ms address-attempt default timed out before Neon completed TCP
// connections on the development network. Keep address fallback, with room for RTT.
setDefaultAutoSelectFamilyAttemptTimeout(3_000);

export function createDatabase(connectionString: string, logger: Logger) {
  const url = new URL(connectionString);
  // Make certificate verification explicit, including after pg's next major release.
  url.searchParams.set('sslmode', 'verify-full');
  const pool = new Pool({
    connectionString: url.toString(),
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 5_000,
    query_timeout: 6_000,
  });
  pool.on('error', () => logger.error('Idle database connection failed'));
  return {
    pool,
    db: drizzle(pool, { schema }),
    check: async () => {
      await pool.query('SELECT 1');
    },
    close: () => pool.end(),
  };
}
