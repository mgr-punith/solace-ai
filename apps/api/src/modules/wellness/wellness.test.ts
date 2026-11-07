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
import { createMoodRepository } from '../mood/repository.js';
import { createMoodService } from '../mood/service.js';
import { createWellnessRepository } from './repository.js';
import { createWellnessService } from './service.js';
const database = createTestDatabase();
const users = new Set<string>();
let now = new Date('2026-11-07T12:00:00Z');
const clock = () => now;
const auth = createAuthService({
  repository: createAuthRepository(database.pool),
  clock,
  tokens: createTokens({
    accessSecret: 'test-access-secret-with-at-least-32-chars',
    refreshSecret: 'test-refresh-secret-with-at-least-32-chars',
    clock,
  }),
  verifyGoogle: async (id) => ({
    sub: `wellness-${id}`,
    email: 'wellness@example.invalid',
    name: 'Test',
    avatarUrl: null,
  }),
});
const app = createApp({
  checkDatabase: database.check,
  logger: createLogger('silent'),
  auth,
  wellness: createWellnessService({ repository: createWellnessRepository(database.db), clock }),
  mood: createMoodService({ repository: createMoodRepository(database.db), clock }),
});
beforeAll(async () => {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../../db/migrations', import.meta.url)),
  });
});
afterAll(async () => {
  for (const id of users) await database.pool.query('DELETE FROM users WHERE id=$1', [id]);
  await database.close();
});
async function login() {
  const session = await auth.google(randomUUID());
  users.add(session.user.id);
  return session;
}
const breathing = () => ({
  requestId: randomUUID(),
  timezone: 'Asia/Kolkata',
  type: 'breathing',
  pattern: 'box',
  durationSeconds: 60,
  beforeMood: 2,
  afterMood: 3,
});
it('requires auth and rejects invalid, spoofed and timestamped activity requests', async () => {
  for (const path of ['/v1/progress', '/v1/affirmation-favorites'])
    await request(app).get(path).expect(401);
  await request(app).post('/v1/activities').send(breathing()).expect(401);
  const a = await login();
  for (const extra of [
    { durationSeconds: 7 },
    { userId: a.user.id },
    { completedAt: now.toISOString() },
    { pattern: 'bad' },
    { timezone: 'Bad/Zone' },
  ]) {
    await request(app)
      .post('/v1/activities')
      .auth(a.accessToken, { type: 'bearer' })
      .send({ ...breathing(), ...extra })
      .expect(400);
  }
  await request(app)
    .get('/v1/progress?timezone=Bad/Zone')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(400);
  await request(app)
    .put('/v1/affirmation-favorites/no-such-line')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(400);
});
it('saves exactly one completed activity for concurrent retries, detects conflicts and isolates owners', async () => {
  const a = await login();
  const b = await login();
  const input = breathing();
  const send = () =>
    request(app).post('/v1/activities').auth(a.accessToken, { type: 'bearer' }).send(input);
  const responses = await Promise.all([send(), send()]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
  expect(responses[0]!.body.activity.id).toBe(responses[1]!.body.activity.id);
  expect(responses[0]!.headers['cache-control']).toBe('no-store');
  await request(app)
    .post('/v1/activities')
    .auth(a.accessToken, { type: 'bearer' })
    .send({ ...input, durationSeconds: 300 })
    .expect(409);
  const own = await request(app)
    .get('/v1/progress?timezone=Asia/Kolkata')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(own.body.days.at(-1)).toMatchObject({
    actions: 1,
    breathingSeconds: 60,
    breathingSessions: 1,
  });
  expect(own.body.currentStreak).toBe(1);
  const other = await request(app)
    .get('/v1/progress')
    .auth(b.accessToken, { type: 'bearer' })
    .expect(200);
  expect(other.body.totalDays).toBe(0);
  const profile = await database.pool.query('SELECT timezone FROM profiles WHERE user_id=$1', [
    a.user.id,
  ]);
  expect(profile.rows[0].timezone).toBe('Asia/Kolkata');
});
it('combines moods and activities on local days, averages moods, and updates after deleting a mood', async () => {
  now = new Date('2026-11-07T18:29:00Z');
  const a = await login();
  const saved = await request(app)
    .post('/v1/mood-checkins')
    .auth(a.accessToken, { type: 'bearer' })
    .send({ requestId: randomUUID(), timezone: 'Asia/Kolkata', mood: 2, tags: [], note: '' })
    .expect(201);
  await request(app)
    .post('/v1/mood-checkins')
    .auth(a.accessToken, { type: 'bearer' })
    .send({ requestId: randomUUID(), timezone: 'Asia/Kolkata', mood: 4, tags: [], note: '' })
    .expect(201);
  now = new Date('2026-11-07T18:31:00Z');
  await request(app)
    .post('/v1/activities')
    .auth(a.accessToken, { type: 'bearer' })
    .send(breathing())
    .expect(201);
  const india = await request(app)
    .get('/v1/progress?timezone=Asia/Kolkata')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(india.body.currentStreak).toBe(2);
  expect(india.body.days.at(-2)).toMatchObject({ day: '2026-11-07', actions: 2, moodAverage: 3 });
  expect(india.body.days.at(-1)).toMatchObject({
    day: '2026-11-08',
    moodAverage: null,
    breathingSeconds: 60,
  });
  const utc = await request(app)
    .get('/v1/progress?timezone=UTC')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(utc.body.currentStreak).toBe(1);
  expect(utc.body.days.at(-1).actions).toBe(3);
  await request(app)
    .delete(`/v1/mood-checkins/${saved.body.checkin.id}`)
    .auth(a.accessToken, { type: 'bearer' })
    .expect(204);
  const updated = await request(app)
    .get('/v1/progress?timezone=Asia/Kolkata')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(updated.body.days.at(-2).moodAverage).toBe(4);
});
it('handles spring-forward and repeated fall-back hours as calendar days in PostgreSQL', async () => {
  const instants = [
    '2026-03-07T17:00:00Z',
    '2026-03-08T16:00:00Z',
    '2026-10-31T16:00:00Z',
    '2026-11-01T05:30:00Z',
    '2026-11-01T06:30:00Z',
  ];
  for (const instant of instants) {
    now = new Date(instant);
    // Issue a fresh test session at each clock position so auth expiry remains realistic.
    const current = await auth.google('dst-owner');
    users.add(current.user.id);
    await request(app)
      .post('/v1/activities')
      .auth(current.accessToken, { type: 'bearer' })
      .send({ ...breathing(), timezone: 'America/New_York' })
      .expect(201);
    const progress = await request(app)
      .get('/v1/progress?timezone=America/New_York')
      .auth(current.accessToken, { type: 'bearer' })
      .expect(200);
    if (instant === '2026-03-08T16:00:00Z') expect(progress.body.currentStreak).toBe(2);
    if (instant === '2026-11-01T06:30:00Z') {
      expect(progress.body.currentStreak).toBe(2);
      expect(progress.body.days.at(-1).actions).toBe(2);
    }
  }
  now = new Date('2026-11-07T12:00:00Z');
});
it('keeps favorites private and idempotent, logs explicit affirmation reading, and cascades account deletion', async () => {
  const a = await login();
  const b = await login();
  for (let i = 0; i < 2; i++)
    await request(app)
      .put('/v1/affirmation-favorites/sol-01')
      .auth(a.accessToken, { type: 'bearer' })
      .expect(204);
  const list = await request(app)
    .get('/v1/affirmation-favorites')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(list.body.items).toHaveLength(1);
  await request(app)
    .delete('/v1/affirmation-favorites/sol-01')
    .auth(b.accessToken, { type: 'bearer' })
    .expect(204);
  const own = await request(app)
    .get('/v1/affirmation-favorites')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(own.body.items).toHaveLength(1);
  const read = {
    requestId: randomUUID(),
    type: 'affirmation',
    affirmationId: 'sol-01',
    timezone: 'UTC',
  };
  await request(app)
    .post('/v1/activities')
    .auth(a.accessToken, { type: 'bearer' })
    .send(read)
    .expect(201);
  await request(app)
    .post('/v1/activities')
    .auth(a.accessToken, { type: 'bearer' })
    .send(read)
    .expect(200);
  await request(app)
    .delete('/v1/affirmation-favorites/sol-01')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(204);
  await request(app)
    .put('/v1/affirmation-favorites/sol-02')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(204);
  await request(app).delete('/v1/me').auth(a.accessToken, { type: 'bearer' }).expect(204);
  for (const table of ['activity_logs', 'affirmation_favorites']) {
    const result = await database.pool.query(
      `SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`,
      [a.user.id],
    );
    expect(result.rows[0].count).toBe(0);
  }
});
