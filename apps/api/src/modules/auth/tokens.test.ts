import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTokens } from './tokens.js';

const now = new Date('2026-11-05T12:00:00Z');
const accessSecret = 'test-access-secret-that-is-at-least-32-characters';
const refreshSecret = 'test-refresh-secret-that-is-at-least-32-characters';

describe('session tokens', () => {
  it('accepts only unexpired Solace access tokens with the intended audience and signature', async () => {
    let current = now;
    const tokens = createTokens({ accessSecret, refreshSecret, clock: () => current });
    const userId = randomUUID();
    const sessionId = randomUUID();
    const access = await tokens.access(userId, sessionId);
    expect(await tokens.verify(access.token)).toEqual({ userId, sessionId });
    await expect(tokens.verify(access.token + 'tampered')).rejects.toThrow();
    const other = createTokens({
      accessSecret: accessSecret + 'other',
      refreshSecret,
      clock: () => now,
    });
    await expect(other.verify(access.token)).rejects.toThrow();
    current = new Date(now.getTime() + 15 * 60_000);
    await expect(tokens.verify(access.token)).rejects.toThrow();
  });

  it('stores a keyed digest instead of the refresh secret and generates independent tokens', () => {
    const tokens = createTokens({ accessSecret, refreshSecret, clock: () => now });
    const first = tokens.refresh();
    const second = tokens.refresh();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).not.toContain(first.token);
    expect(first.hash).toHaveLength(64);
    expect(tokens.hash(first.token)).toBe(first.hash);
  });
});
