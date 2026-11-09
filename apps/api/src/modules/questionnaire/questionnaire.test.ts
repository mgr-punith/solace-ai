import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dailyQuestions, QUESTIONNAIRE_VERSION } from '@solace/shared';
import { createTestDatabase } from '../../test/database.js';
import { createApp } from '../../app.js';
import { createLogger } from '../../config/logger.js';
import { createAuthRepository } from '../auth/repository.js';
import { createAuthService } from '../auth/service.js';
import { createTokens } from '../auth/tokens.js';
import { createWellnessRepository } from '../wellness/repository.js';
import { createWellnessService } from '../wellness/service.js';
import { createQuestionnaireRepository } from './repository.js';
import { createQuestionnaireService } from './service.js';

const database = createTestDatabase();
const users = new Set<string>();
let now = new Date('2026-11-09T12:00:00Z');
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
    sub: `four-${id}`,
    email: 'four@example.invalid',
    name: 'Test',
    avatarUrl: null,
  }),
});
const app = createApp({
  checkDatabase: database.check,
  logger: createLogger('silent'),
  auth,
  questionnaire: createQuestionnaireService({
    repository: createQuestionnaireRepository(database.db),
    clock,
  }),
  wellness: createWellnessService({ repository: createWellnessRepository(database.db), clock }),
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
const input = (day = '2026-11-09', timezone = 'Asia/Kolkata', optionId = 'skip') => ({
  version: QUESTIONNAIRE_VERSION,
  timezone,
  answers: dailyQuestions(day).map((q) => ({ questionId: q.id, optionId })),
});
const status = (token: string, timezone = 'Asia/Kolkata') =>
  request(app)
    .get(`/v1/daily-questions?timezone=${encodeURIComponent(timezone)}`)
    .auth(token, { type: 'bearer' });
const save = (token: string, day = '2026-11-09', body = input(day)) =>
  request(app).put(`/v1/daily-questions/${day}`).auth(token, { type: 'bearer' }).send(body);

it('requires authentication and validates date, timezone, question IDs, option IDs and forged points', async () => {
  now = new Date('2026-11-09T12:00:00Z');
  await request(app).get('/v1/daily-questions').expect(401);
  await request(app).put('/v1/daily-questions/2026-11-09').send(input()).expect(401);
  const a = await login();
  for (const patch of [
    { points: 400 },
    { userId: a.user.id },
    { timezone: 'Bad/Zone' },
    { version: 'future-version' },
    { completedAt: now.toISOString() },
    { answers: input().answers.slice(1) },
    { answers: Array(4).fill(input().answers[0]) },
    { answers: input('2026-11-10').answers },
    { answers: input().answers.map((answer) => ({ ...answer, optionId: 'perfect' })) },
  ])
    await save(a.accessToken, '2026-11-09', { ...input(), ...patch }).expect(400);
  await save(a.accessToken, '2026-02-30', input()).expect(400);
  await save(a.accessToken, '2026-11-10', input('2026-11-10')).expect(409);
  await request(app)
    .get('/v1/daily-questions?userId=someone-else')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(400);
  await status(a.accessToken, 'Bad/Zone').expect(400);
});

it('awards exactly 40 points under concurrent saves and repeat choices, and isolates owners', async () => {
  now = new Date('2026-11-09T12:00:00Z');
  const a = await login();
  const b = await login();
  const empty = await status(a.accessToken).expect(200);
  expect(empty.body).toMatchObject({
    day: '2026-11-09',
    pointsAvailable: 40,
    totalPoints: 0,
    completion: null,
  });
  expect(empty.body.questions).toEqual(dailyQuestions('2026-11-09'));
  expect(empty.headers['cache-control']).toBe('no-store');
  const responses = await Promise.all([
    save(a.accessToken),
    save(a.accessToken),
    save(a.accessToken),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 201]);
  expect(new Set(responses.map((r) => r.body.completion.id)).size).toBe(1);
  for (const result of responses)
    expect(result.body).toMatchObject({
      totalPoints: 40,
      completion: { points: 40, day: '2026-11-09' },
    });
  const repeated = await save(
    a.accessToken,
    '2026-11-09',
    input('2026-11-09', 'UTC', 'low'),
  ).expect(200);
  expect(repeated.body.totalPoints).toBe(40);
  expect((await status(a.accessToken).expect(200)).body).toMatchObject({
    totalPoints: 40,
    completion: { id: responses[0]!.body.completion.id },
  });
  expect((await status(b.accessToken).expect(200)).body).toMatchObject({
    totalPoints: 0,
    completion: null,
  });
  expect(
    (
      await save(b.accessToken, '2026-11-09', input('2026-11-09', 'Asia/Kolkata', 'high')).expect(
        201,
      )
    ).body.totalPoints,
  ).toBe(40);
  const rows = await database.pool.query(
    'SELECT * FROM questionnaire_completions WHERE user_id=$1',
    [a.user.id],
  );
  expect(rows.rows).toHaveLength(1);
  expect(rows.rows[0]).not.toHaveProperty('answers');
  expect(JSON.stringify(empty.body)).not.toContain(a.user.id);
  const progress = await request(app)
    .get('/v1/progress?timezone=Asia/Kolkata')
    .auth(a.accessToken, { type: 'bearer' })
    .expect(200);
  expect(progress.body).toMatchObject({ currentStreak: 1, totalDays: 1 });
  expect(progress.body.days.at(-1)).toMatchObject({
    actions: 1,
    moodAverage: null,
    breathingSeconds: 0,
  });
});

it('keeps accepted retries on their original day across midnight and rejects unsaved old drafts', async () => {
  now = new Date('2026-11-09T18:29:30Z');
  const a = await login();
  const b = await login();
  const first = await save(a.accessToken).expect(201);
  now = new Date('2026-11-09T18:30:30Z');
  expect((await status(a.accessToken).expect(200)).body).toMatchObject({
    day: '2026-11-10',
    totalPoints: 40,
    completion: null,
  });
  const retry = await save(a.accessToken).expect(200);
  expect(retry.body).toEqual(first.body);
  await save(b.accessToken).expect(409);
  const next = await save(a.accessToken, '2026-11-10').expect(201);
  expect(next.body.totalPoints).toBe(80);
  expect((await status(a.accessToken, 'UTC').expect(200)).body.completion.id).toBe(
    first.body.completion.id,
  );
});

it('does not award a second time during a repeated DST hour and removes completions with the account', async () => {
  now = new Date('2026-11-01T05:59:30Z');
  const a = await login();
  const day = '2026-11-01';
  const body = input(day, 'America/New_York');
  const first = await save(a.accessToken, day, body).expect(201);
  now = new Date('2026-11-01T06:01:00Z');
  expect((await save(a.accessToken, day, body).expect(200)).body).toEqual(first.body);
  await request(app).delete('/v1/me').auth(a.accessToken, { type: 'bearer' }).expect(204);
  expect(
    (
      await database.pool.query('SELECT id FROM questionnaire_completions WHERE user_id=$1', [
        a.user.id,
      ])
    ).rows,
  ).toHaveLength(0);
  await status(a.accessToken).expect(401);
});
