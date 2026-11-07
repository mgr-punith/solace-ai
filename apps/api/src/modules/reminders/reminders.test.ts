import { defaultReminders } from '@solace/shared';
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
import { createReminderRepository } from './repository.js';
import { createReminderService } from './service.js';

const logger = createLogger('silent');
const database = createTestDatabase();
const created = new Set<string>();
const now = new Date('2026-11-06T18:31:00Z');
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
    sub: `reminders-test-${id}`,
    email: 'reminders@example.invalid',
    name: 'Test',
    avatarUrl: null,
  }),
});
const app = createApp({
  checkDatabase: database.check,
  logger,
  auth,
  reminders: createReminderService({ repository: createReminderRepository(database.db), clock }),
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
const settings = () => {
  const value = defaultReminders('Asia/Kolkata');
  value.reminders[0]!.enabled = true;
  value.reminders[4]!.customText = 'A private gentle nudge';
  return value;
};
it('requires authentication and validates full settings without accepting ownership from input', async () => {
  await request(app).get('/v1/reminders').expect(401);
  await request(app).put('/v1/reminders').send(settings()).expect(401);
  const a = await login();
  for (const payload of [
    { ...settings(), userId: randomUUID() },
    { ...settings(), timezone: 'Invalid/Zone' },
    { ...settings(), reminders: [] },
    { ...settings(), quietHours: { enabled: true, start: '25:00', end: '08:00' } },
  ]) {
    const result = await request(app)
      .put('/v1/reminders')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send(payload)
      .expect(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
  }
});
it('defaults off, restores settings, isolates users and makes identical retries idempotent', async () => {
  const a = await login();
  const b = await login();
  const get = (token: string) =>
    request(app).get('/v1/reminders').set('Authorization', `Bearer ${token}`);
  expect((await get(a.accessToken).expect(200)).body.settings).toEqual(defaultReminders());
  const payload = settings();
  const send = () =>
    request(app)
      .put('/v1/reminders')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send(payload)
      .expect(200);
  const results = await Promise.all([send(), send()]);
  expect(results[0]!.headers['cache-control']).toBe('no-store');
  expect((await get(a.accessToken)).body.settings).toEqual(payload);
  expect((await get(b.accessToken)).body.settings).toEqual(defaultReminders());
  const rows = await database.pool.query(
    'SELECT count(*)::int AS count FROM reminder_preferences WHERE user_id = $1',
    [a.user.id],
  );
  expect(rows.rows[0].count).toBe(1);
  payload.reminders[0]!.enabled = false;
  await send();
  expect((await get(a.accessToken)).body.settings.reminders[0].enabled).toBe(false);
});
it('account deletion cascades reminder preferences and revokes access', async () => {
  const a = await login();
  await request(app)
    .put('/v1/reminders')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(settings())
    .expect(200);
  await request(app).delete('/v1/me').set('Authorization', `Bearer ${a.accessToken}`).expect(204);
  const rows = await database.pool.query(
    'SELECT count(*)::int AS count FROM reminder_preferences WHERE user_id = $1',
    [a.user.id],
  );
  expect(rows.rows[0].count).toBe(0);
  await request(app)
    .get('/v1/reminders')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(401);
});
