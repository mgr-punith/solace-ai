import { createTestDatabase } from '../../test/database.js';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../../app.js';
import { createLogger } from '../../config/logger.js';
import { createAuthRepository } from './repository.js';
import { createAuthService } from './service.js';
import { createTokens } from './tokens.js';

const logger = createLogger('silent');
const database = createTestDatabase();
const createdIds = new Set<string>();
const subjectPrefix = `auth-test-${randomUUID()}`;
let current = new Date('2026-11-05T12:00:00Z');
const clock = () => current;
const tokens = createTokens({
  accessSecret: 'test-access-secret-that-is-at-least-32-characters',
  refreshSecret: 'test-refresh-secret-that-is-at-least-32-characters',
  clock,
});
const verifyGoogle = vi.fn(async (idToken: string) => {
  if (idToken === 'invalid') throw new Error('private-google-error');
  return {
    sub: `${subjectPrefix}-${idToken}`,
    email: 'auth-test@example.invalid',
    name: 'Test person',
    avatarUrl: null,
  };
});
const auth = createAuthService({
  repository: createAuthRepository(database.pool),
  tokens,
  verifyGoogle,
  clock,
});
const app = createApp({ checkDatabase: database.check, logger, auth });

beforeAll(async () => {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../../db/migrations', import.meta.url)),
  });
});
afterAll(async () => {
  for (const id of createdIds) await database.pool.query('DELETE FROM users WHERE id = $1', [id]);
  await database.close();
});

async function signIn(identity = randomUUID()) {
  const result = await request(app).post('/v1/auth/google').send({ idToken: identity }).expect(200);
  createdIds.add(result.body.user.id);
  return result.body as {
    user: { id: string; name: string };
    accessToken: string;
    refreshToken: string;
  };
}

describe('authentication with disposable PostgreSQL', () => {
  it('validates input before calling Google and hides verifier failures', async () => {
    const calls = verifyGoogle.mock.calls.length;
    const invalid = await request(app).post('/v1/auth/google').send({ idToken: '' }).expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(verifyGoogle.mock.calls).toHaveLength(calls);
    const rejected = await request(app)
      .post('/v1/auth/google')
      .send({ idToken: 'invalid' })
      .expect(401);
    expect(rejected.body.error.code).toBe('GOOGLE_TOKEN_INVALID');
    expect(rejected.text).not.toContain('private-google-error');
  });

  it('upserts by Google subject, returns only the caller, and hashes stored refresh tokens', async () => {
    const identity = randomUUID();
    const first = await signIn(identity);
    const same = await signIn(identity);
    const other = await signIn();
    expect(first.user.id).toBe(same.user.id);
    expect(other.user.id).not.toBe(first.user.id);
    const me = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    expect(me.body.user.id).toBe(first.user.id);
    const rows = await database.pool.query<{ token_hash: string }>(
      'SELECT token_hash FROM refresh_tokens WHERE user_id = $1',
      [first.user.id],
    );
    expect(rows.rows.length).toBe(2);
    expect(rows.rows.map((row) => row.token_hash)).toContain(tokens.hash(first.refreshToken));
    expect(JSON.stringify(rows.rows)).not.toContain(first.refreshToken);
    await request(app).get('/v1/me').expect(401);
    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${first.accessToken}invalid`)
      .expect(401);
  });

  it('rotates once and revokes the whole session if a spent refresh token is replayed', async () => {
    const session = await signIn();
    const rotated = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(session.refreshToken);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(401);
  });

  it('allows only one concurrent refresh and immediately rejects access after logout', async () => {
    const session = await signIn();
    const responses = await Promise.all([
      request(app).post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }),
      request(app).post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    const independent = await signIn();
    await request(app)
      .post('/v1/auth/logout')
      .send({ refreshToken: independent.refreshToken })
      .expect(204);
    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${independent.accessToken}`)
      .expect(401);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: independent.refreshToken })
      .expect(401);
  });

  it('rejects expired access and refresh tokens using the injected clock', async () => {
    const session = await signIn();
    current = new Date(current.getTime() + 15 * 60_000);
    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(401);
    const refreshed = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    current = new Date(current.getTime() + 31 * 24 * 60 * 60_000);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('hard-deletes only the authenticated account and cascades sessions and refresh tokens', async () => {
    const first = await signIn();
    const other = await signIn();
    await request(app)
      .delete('/v1/me')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ userId: other.user.id })
      .expect(400);
    await request(app)
      .delete('/v1/me')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(204);
    for (const table of ['users', 'auth_sessions', 'refresh_tokens']) {
      const column = table === 'users' ? 'id' : 'user_id';
      const rows = await database.pool.query(
        `SELECT count(*)::int AS count FROM ${table} WHERE ${column} = $1`,
        [first.user.id],
      );
      expect(rows.rows[0].count).toBe(0);
    }
    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(401);
    const survivor = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200);
    expect(survivor.body.user.id).toBe(other.user.id);
  });
});
