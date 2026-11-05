import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const url = 'postgresql://user:private-password@example.neon.tech/db?sslmode=require';
const auth = {
  GOOGLE_WEB_CLIENT_ID: '123456789-test.apps.googleusercontent.com',
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-characters',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-characters',
};

describe('configuration', () => {
  it('requires auth configuration while allowing AI to be deferred', () => {
    expect(parseEnv({ DATABASE_URL: url, ...auth }).PORT).toBe(4000);
    expect(() => parseEnv({ DATABASE_URL: url })).toThrow('GOOGLE_WEB_CLIENT_ID');
    expect(() =>
      parseEnv({ DATABASE_URL: url, ...auth, JWT_REFRESH_SECRET: auth.JWT_ACCESS_SECRET }),
    ).toThrow('JWT_REFRESH_SECRET');
  });
  it('fails fast for missing or insecure database configuration', () => {
    expect(() => parseEnv({})).toThrow('DATABASE_URL');
    expect(() => parseEnv({ DATABASE_URL: url.replace('?sslmode=require', ''), ...auth })).toThrow(
      'DATABASE_URL',
    );
  });
  it('does not expose secrets through validation errors', () => {
    let message = '';
    try {
      parseEnv({ DATABASE_URL: 'private-password', PORT: 'wrong', ...auth });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('private-password');
  });
  it('parses a strict origin allowlist', () => {
    expect(
      parseEnv({
        DATABASE_URL: url,
        ...auth,
        CORS_ORIGINS: 'https://solace.example, https://preview.example',
      }).CORS_ORIGINS,
    ).toEqual(['https://solace.example', 'https://preview.example']);
  });
});
