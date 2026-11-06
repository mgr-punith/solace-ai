import { createTestDatabase } from '../test/database.js';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../app.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('silent');
const database = createTestDatabase();

beforeAll(async () => {
  try {
    await migrate(database.db, {
      migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)),
    });
  } catch {
    throw new Error(
      'Disposable PostgreSQL migration failed. Check the test container and migrations.',
    );
  }
});
afterAll(async () => {
  await database.close();
});

describe('PostgreSQL integration', () => {
  it('reports ready only after querying the real database', async () => {
    const app = createApp({ checkDatabase: database.check, logger });
    const result = await request(app).get('/ready').expect(200);
    expect(result.body).toEqual({ status: 'ok', database: 'connected' });
  });
  it('applies the users migration and enforces unique Google identities', async () => {
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      const sub = `test-${randomUUID()}`;
      const result = await client.query<{ id: string; created_at: Date }>(
        'INSERT INTO users (google_sub, email, name) VALUES ($1, $2, $3) RETURNING id, created_at',
        [sub, 'test@example.invalid', 'Test user'],
      );
      expect(result.rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.rows[0]?.created_at).toBeInstanceOf(Date);
      await expect(
        client.query('INSERT INTO users (google_sub, email, name) VALUES ($1, $2, $3)', [
          sub,
          'different@example.invalid',
          'Duplicate',
        ]),
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
