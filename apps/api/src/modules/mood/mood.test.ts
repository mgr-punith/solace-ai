import { createTestDatabase } from '../../test/database.js';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../../app.js';
import { createLogger } from '../../config/logger.js';
import { createAuthRepository } from '../auth/repository.js';
import { createAuthService } from '../auth/service.js';
import { createTokens } from '../auth/tokens.js';
import { createMoodRepository } from './repository.js';
import { createMoodService } from './service.js';

const logger = createLogger('silent');
const database = createTestDatabase();
const created = new Set<string>();
let now = new Date('2026-11-06T18:31:00Z');
const clock = () => now;
const auth = createAuthService({
  repository: createAuthRepository(database.pool),
  tokens: createTokens({
    accessSecret: 'test-access-secret-with-at-least-32-chars',
    refreshSecret: 'test-refresh-secret-with-at-least-32-chars',
    clock,
  }),
  clock,
  verifyGoogle: async (id) => ({
    sub: `mood-test-${id}`,
    email: 'mood@example.invalid',
    name: 'Test',
    avatarUrl: null,
  }),
});
const app = createApp({
  checkDatabase: database.check,
  logger,
  auth,
  mood: createMoodService({ repository: createMoodRepository(database.db), clock }),
});
beforeAll(async () => {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../../db/migrations', import.meta.url)),
  });
});
afterAll(async () => {
  for (const id of created) await database.pool.query('DELETE FROM users WHERE id = $1', [id]);
  await database.close();
});
async function login() {
  const result = await auth.google(randomUUID());
  created.add(result.user.id);
  return result;
}
const input = () => ({
  requestId: randomUUID(),
  mood: 2,
  tags: ['Tired'],
  note: 'A long day',
  timezone: 'Asia/Kolkata',
});

it('requires authentication and rejects invalid or owner-spoofed input', async () => {
  await request(app).get('/v1/mood-checkins').expect(401);
  await request(app).post('/v1/mood-checkins').send(input()).expect(401);
  const a = await login();
  for (const extra of [
    { mood: 8 },
    { userId: randomUUID() },
    { timezone: 'Invalid/Zone' },
    { tags: ['Unknown'] },
  ]) {
    await request(app)
      .post('/v1/mood-checkins')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ ...input(), ...extra })
      .expect(400);
  }
  await request(app)
    .get('/v1/mood-checkins?cursor=invalid')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(400);
});
it('saves a private entry, lists it, and stores timezone in the profile', async () => {
  const a = await login();
  const b = await login();
  const payload = input();
  const saved = await request(app)
    .post('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(payload)
    .expect(201);
  expect(saved.headers.location).toBe(`/v1/mood-checkins/${saved.body.checkin.id}`);
  expect(saved.headers['cache-control']).toBe('no-store');
  expect(saved.body.checkin).toMatchObject({
    mood: 2,
    tags: ['Tired'],
    note: 'A long day',
    timezone: 'Asia/Kolkata',
  });
  const own = await request(app)
    .get('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(200);
  expect(own.body.items).toHaveLength(1);
  const other = await request(app)
    .get('/v1/mood-checkins')
    .set('Authorization', `Bearer ${b.accessToken}`)
    .expect(200);
  expect(other.body.items).toEqual([]);
  await request(app)
    .delete(`/v1/mood-checkins/${saved.body.checkin.id}`)
    .set('Authorization', `Bearer ${b.accessToken}`)
    .expect(404);
  const profile = await database.pool.query('SELECT timezone FROM profiles WHERE user_id = $1', [
    a.user.id,
  ]);
  expect(profile.rows[0].timezone).toBe('Asia/Kolkata');
});
it('retries and concurrent requests create one entry, while changed content conflicts', async () => {
  const a = await login();
  const payload = input();
  const send = () =>
    request(app)
      .post('/v1/mood-checkins')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send(payload);
  const results = await Promise.all([send(), send()]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
  expect(results[0]!.body.checkin.id).toBe(results[1]!.body.checkin.id);
  await request(app)
    .post('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send({ ...payload, mood: 4 })
    .expect(409);
});
it('paginates equal timestamps without duplicates and filters today in the requested timezone', async () => {
  const a = await login();
  for (let i = 0; i < 3; i++)
    await request(app)
      .post('/v1/mood-checkins')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send(input())
      .expect(201);
  const page = await request(app)
    .get('/v1/mood-checkins?limit=2')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(200);
  const next = await request(app)
    .get('/v1/mood-checkins')
    .query({ limit: 2, cursor: page.body.nextCursor })
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(200);
  expect(
    new Set([...page.body.items, ...next.body.items].map((r: { id: string }) => r.id)).size,
  ).toBe(3);
  expect(next.body.nextCursor).toBeNull();
  now = new Date('2026-11-06T18:29:00Z');
  await request(app)
    .post('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(input())
    .expect(201);
  now = new Date('2026-11-06T18:31:00Z');
  const india = await request(app)
    .get('/v1/mood-checkins')
    .query({ period: 'today', timezone: 'Asia/Kolkata' })
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(200);
  expect(india.body.items).toHaveLength(3);
  const utc = await request(app)
    .get('/v1/mood-checkins')
    .query({ period: 'today', timezone: 'UTC' })
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(200);
  expect(utc.body.items).toHaveLength(4);
});
it('deletes one own entry and cascades all remaining mood/profile data on account deletion', async () => {
  const a = await login();
  const first = await request(app)
    .post('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(input())
    .expect(201);
  await request(app)
    .delete(`/v1/mood-checkins/${first.body.checkin.id}`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(204);
  await request(app)
    .get(`/v1/mood-checkins/${first.body.checkin.id}`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(404);
  await request(app)
    .post('/v1/mood-checkins')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(input())
    .expect(201);
  await request(app).delete('/v1/me').set('Authorization', `Bearer ${a.accessToken}`).expect(204);
  for (const table of ['mood_checkins', 'profiles']) {
    const rows = await database.pool.query(
      `SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`,
      [a.user.id],
    );
    expect(rows.rows[0].count).toBe(0);
  }
});
