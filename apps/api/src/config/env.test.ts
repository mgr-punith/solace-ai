import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const url = 'postgresql://user:private-password@example.neon.tech/db?sslmode=require';

describe('configuration', () => {
  it('boots the foundation without Google or AI secrets', () => {
    expect(parseEnv({ DATABASE_URL: url }).PORT).toBe(4000);
  });
  it('fails fast for missing or insecure database configuration', () => {
    expect(() => parseEnv({})).toThrow('DATABASE_URL');
    expect(() => parseEnv({ DATABASE_URL: url.replace('?sslmode=require', '') })).toThrow(
      'DATABASE_URL',
    );
  });
  it('does not expose secrets through validation errors', () => {
    let message = '';
    try {
      parseEnv({ DATABASE_URL: 'private-password', PORT: 'wrong' });
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
        CORS_ORIGINS: 'https://solace.example, https://preview.example',
      }).CORS_ORIGINS,
    ).toEqual(['https://solace.example', 'https://preview.example']);
  });
});
