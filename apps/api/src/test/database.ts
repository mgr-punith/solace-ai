import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { inject } from 'vitest';
import * as schema from '../db/schema/index.js';
import { testDatabaseConfig } from './database-config.js';

// No .env loading or DATABASE_URL fallback: settings come from Vitest's container setup.
export function createTestDatabase() {
  const pool = new Pool(testDatabaseConfig(inject('testDatabase')));
  return {
    pool,
    db: drizzle(pool, { schema }),
    check: async () => {
      await pool.query('SELECT 1');
    },
    close: () => pool.end(),
  };
}
