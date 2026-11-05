import { describe, expect, it } from 'vitest';
import { readyResponseSchema } from './index.js';

describe('readiness contract', () => {
  it('requires an actual connected database rather than liveness alone', () => {
    expect(readyResponseSchema.safeParse({ status: 'ok' }).success).toBe(false);
    expect(readyResponseSchema.safeParse({ status: 'ok', database: 'offline' }).success).toBe(
      false,
    );
    expect(readyResponseSchema.parse({ status: 'ok', database: 'connected' })).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });
});
