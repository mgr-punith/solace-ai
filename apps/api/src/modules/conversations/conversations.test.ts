import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createTestDatabase } from '../../test/database.js';
import { createLogger } from '../../config/logger.js';
import { createApp } from '../../app.js';
import { createAuthRepository } from '../auth/repository.js';
import { createAuthService } from '../auth/service.js';
import { createTokens } from '../auth/tokens.js';
import { createConversationRepository } from './repository.js';
import { createConversationService } from './service.js';
import type { LLMProvider } from '../../ai/provider.js';
const db = createTestDatabase();
const clock = () => new Date();
const logger = createLogger('silent');
const auth = createAuthService({
  repository: createAuthRepository(db.pool),
  clock,
  tokens: createTokens({ accessSecret: 'a'.repeat(40), refreshSecret: 'b'.repeat(40), clock }),
  verifyGoogle: async (sub) => ({
    sub,
    email: 'chat-test@example.invalid',
    name: 'Test',
    avatarUrl: null,
  }),
});
const reply = vi
  .fn<LLMProvider['reply']>()
  .mockResolvedValue('That sounds like a lot. What feels hardest right now?');
const safety = vi.fn();
const repo = createConversationRepository(db.pool);
const chat = createConversationService({
  repository: repo,
  provider: { reply },
  clock,
  onSafety: safety,
});
const app = createApp({ checkDatabase: db.check, logger, auth, chat });
const people = new Set<string>();
async function login() {
  const session = await auth.google(randomUUID());
  people.add(session.user.id);
  return session;
}
async function conversation(token: string) {
  const r = await request(app)
    .post('/v1/conversations')
    .set('Authorization', `Bearer ${token}`)
    .send({ requestId: randomUUID() })
    .expect(201);
  return r.body.conversation.id as string;
}
beforeAll(() =>
  migrate(db.db, {
    migrationsFolder: fileURLToPath(new URL('../../db/migrations', import.meta.url)),
  }),
);
afterAll(async () => {
  for (const id of people) await db.pool.query('DELETE FROM users WHERE id=$1', [id]);
  await db.close();
});
it('authorizes every conversation/message operation and validates inputs', async () => {
  await request(app).get('/v1/conversations').expect(401);
  const a = await login(),
    b = await login();
  const id = await conversation(a.accessToken);
  for (const path of [`/v1/conversations/${id}`, `/v1/conversations/${id}/messages`])
    await request(app).get(path).set('Authorization', `Bearer ${b.accessToken}`).expect(404);
  await request(app)
    .post(`/v1/conversations/${id}/messages`)
    .set('Authorization', `Bearer ${b.accessToken}`)
    .send({ requestId: randomUUID(), content: 'Hello' })
    .expect(404);
  await request(app)
    .delete(`/v1/conversations/${id}`)
    .set('Authorization', `Bearer ${b.accessToken}`)
    .expect(404);
  await request(app)
    .post(`/v1/conversations/${id}/messages`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send({ requestId: randomUUID(), content: 'x'.repeat(2001) })
    .expect(400);
  await request(app)
    .get('/v1/conversations?cursor=invalid')
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(400);
});
it('persists complete turns, returns the same retry and includes current conversation context', async () => {
  const a = await login();
  const id = await conversation(a.accessToken);
  const input = { requestId: randomUUID(), content: 'I am anxious about tomorrow' };
  const first = await request(app)
    .post(`/v1/conversations/${id}/messages`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(input)
    .expect(200);
  const calls = reply.mock.calls.length;
  const second = await request(app)
    .post(`/v1/conversations/${id}/messages`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send(input)
    .expect(200);
  expect(second.body).toEqual(first.body);
  expect(reply).toHaveBeenCalledTimes(calls);
  await request(app)
    .post(`/v1/conversations/${id}/messages`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .send({ ...input, content: 'changed' })
    .expect(409);
  const fresh = createConversationService({
    repository: createConversationRepository(db.pool),
    provider: { reply },
    clock,
  });
  const history = await fresh.messages(a.user.id, id, { limit: 20 });
  expect(history.items).toHaveLength(2);
  expect(history.items[1]?.content).toBe(input.content);
  await fresh.send(a.user.id, id, { requestId: randomUUID(), content: 'Mostly the meeting' });
  expect(reply.mock.calls.at(-1)?.[0]).toEqual(
    expect.arrayContaining([expect.objectContaining({ role: 'user', content: input.content })]),
  );
  const page = await fresh.messages(a.user.id, id, { limit: 2 });
  expect(page.nextCursor).not.toBeNull();
  const older = await fresh.messages(a.user.id, id, { limit: 2, cursor: page.nextCursor! });
  expect(older.items.map((m) => m.id)).not.toEqual(page.items.map((m) => m.id));
});
it('reserves one active turn, recovers failures without duplicates and prevents stale retries', async () => {
  const a = await login();
  const id = await conversation(a.accessToken);
  const input = { requestId: randomUUID(), content: 'Hello' };
  const claims = await Promise.all([
    repo.claim(a.user.id, id, input, clock()),
    repo.claim(a.user.id, id, input, clock()),
  ]);
  expect(claims.map((c) => c.kind).sort()).toEqual(['busy', 'claimed']);
  const claim = claims.find((c) => c.kind === 'claimed');
  if (claim?.kind !== 'claimed') throw new Error('Missing claim');
  await repo.finish(
    a.user.id,
    id,
    input.requestId,
    claim.leaseId,
    'Unavailable',
    'fallback',
    clock(),
  );
  reply.mockRejectedValueOnce(new Error('secret-provider-error'));
  const failed = await chat.send(a.user.id, id, input);
  expect(failed.assistantMessage.kind).toBe('fallback');
  expect(JSON.stringify(failed)).not.toContain('secret-provider-error');
  const retried = await chat.send(a.user.id, id, input);
  expect(retried.assistantMessage.status).toBe('complete');
  expect((await chat.messages(a.user.id, id, { limit: 20 })).items).toHaveLength(2);
  const retryInput = { requestId: randomUUID(), content: 'Try again' };
  reply.mockRejectedValueOnce(new Error('offline'));
  await chat.send(a.user.id, id, retryInput);
  await chat.send(a.user.id, id, { requestId: randomUUID(), content: 'Moving on' });
  await expect(chat.send(a.user.id, id, retryInput)).rejects.toMatchObject({
    code: 'MESSAGE_STALE',
  });
});
it('takes the crisis path without calling the LLM and persists supportive content', async () => {
  const a = await login();
  const id = await conversation(a.accessToken);
  const calls = reply.mock.calls.length;
  const result = await chat.send(a.user.id, id, {
    requestId: randomUUID(),
    content: 'I want to kill myself',
  });
  expect(result.assistantMessage.kind).toBe('crisis');
  expect(result.assistantMessage.content).toContain('someone you trust');
  expect(reply).toHaveBeenCalledTimes(calls);
  expect(safety).toHaveBeenCalled();
});
it('cascades deletion and rejects a late reply after its conversation is removed', async () => {
  const a = await login();
  const id = await conversation(a.accessToken);
  const input = { requestId: randomUUID(), content: 'Hello' };
  const claim = await repo.claim(a.user.id, id, input, clock());
  if (claim.kind !== 'claimed') throw new Error('Missing claim');
  await chat.remove(a.user.id, id);
  expect(
    await repo.finish(a.user.id, id, input.requestId, claim.leaseId, 'late', 'normal', clock()),
  ).toBeNull();
  expect(
    (await db.pool.query('SELECT id FROM messages WHERE conversation_id=$1', [id])).rowCount,
  ).toBe(0);
  const next = await conversation(a.accessToken);
  await chat.send(a.user.id, next, { requestId: randomUUID(), content: 'Hello again' });
  await request(app).delete('/v1/me').set('Authorization', `Bearer ${a.accessToken}`).expect(204);
  expect(
    (await db.pool.query('SELECT id FROM conversations WHERE user_id=$1', [a.user.id])).rowCount,
  ).toBe(0);
  expect(
    (await db.pool.query('SELECT id FROM messages WHERE conversation_id=$1', [next])).rowCount,
  ).toBe(0);
});

it('paginates only the owner conversations and reuses a creation request', async () => {
  const a = await login(),
    b = await login();
  const key = randomUUID();
  const first = await chat.create(a.user.id, key);
  expect((await chat.create(a.user.id, key)).id).toBe(first.id);
  const second = await chat.create(a.user.id, randomUUID());
  await chat.create(b.user.id, randomUUID());
  const page = await chat.list(a.user.id, { limit: 1 });
  const next = await chat.list(a.user.id, { limit: 1, cursor: page.nextCursor! });
  expect(new Set([...page.items, ...next.items].map((c) => c.id))).toEqual(
    new Set([first.id, second.id]),
  );
  expect(next.nextCursor).toBeNull();
});
it('reclaims an expired reply lease and discards the old worker completion', async () => {
  const a = await login();
  const id = await conversation(a.accessToken);
  const input = { requestId: randomUUID(), content: 'Recover this turn' };
  const old = await repo.claim(a.user.id, id, input, new Date('2026-01-01T00:00:00Z'));
  expect(old.kind).toBe('claimed');
  const current = await repo.claim(a.user.id, id, input, new Date('2026-01-01T00:02:00Z'));
  expect(current.kind).toBe('claimed');
  if (old.kind !== 'claimed' || current.kind !== 'claimed') throw new Error('Missing lease');
  expect(
    await repo.finish(a.user.id, id, input.requestId, old.leaseId, 'old reply', 'normal', clock()),
  ).toBeNull();
  expect(
    (
      await repo.finish(
        a.user.id,
        id,
        input.requestId,
        current.leaseId,
        'current reply',
        'normal',
        clock(),
      )
    )?.assistantMessage.content,
  ).toBe('current reply');
  expect((await chat.messages(a.user.id, id, { limit: 20 })).items).toHaveLength(2);
});
