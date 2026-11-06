import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Writable } from 'node:stream';
import { pino } from 'pino';
import { createApp } from './app.js';
import { createLogger } from './config/logger.js';

const logger = createLogger('silent');
describe('foundation HTTP behavior', () => {
  it('keeps liveness independent of the database and gives every request an ID', async () => {
    const checkDatabase = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const app = createApp({ checkDatabase, logger });
    const first = await request(app).get('/health').expect(200);
    const second = await request(app).get('/health').expect(200);
    expect(first.body).toEqual({ status: 'ok' });
    expect(first.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    expect(checkDatabase).not.toHaveBeenCalled();
  });
  it('returns a recoverable, content-free 503 when Neon is unavailable', async () => {
    const app = createApp({
      checkDatabase: async () => {
        throw new Error('secret-connection-url');
      },
      logger,
    });
    const response = await request(app).get('/ready').expect(503);
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(response.text).not.toContain('secret-connection-url');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('rejects malformed and oversized bodies using the same error envelope', async () => {
    const app = createApp({ checkDatabase: async () => {}, logger });
    const malformed = await request(app)
      .post('/v1/unknown')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
    const oversized = await request(app)
      .post('/v1/unknown')
      .send({ text: 'a'.repeat(17_000) })
      .expect(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('allows only configured browser origins while supporting native clients', async () => {
    const app = createApp({
      checkDatabase: async () => {},
      logger,
      corsOrigins: ['https://solace.example'],
    });
    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://solace.example')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://solace.example');
    const denied = await request(app).get('/health').set('Origin', 'https://unexpected.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    await request(app).get('/health').expect(200);
  });
  it('omits request content, tokens, and query strings from logs', async () => {
    let output = '';
    const stream = new Writable({
      write(chunk, _encoding, next) {
        output += String(chunk);
        next();
      },
    });
    const app = createApp({ checkDatabase: async () => {}, logger: pino({}, stream) });
    await request(app)
      .post('/unknown?token=private-query')
      .set('Authorization', 'Bearer private-token')
      .send({ message: 'private-message' })
      .expect(404);
    expect(output).toContain('Request completed');
    for (const secret of ['private-query', 'private-token', 'private-message'])
      expect(output).not.toContain(secret);
  });
});

it('publishes only the configured provider identity for the chat privacy notice', async () => {
  const app = createApp({ checkDatabase: async () => {}, logger, chatProvider: 'groq' });
  const response = await request(app).get('/v1/chat-provider').expect(200);
  expect(response.body).toEqual({ provider: 'groq' });
  expect(response.headers['cache-control']).toBe('no-store');
});
