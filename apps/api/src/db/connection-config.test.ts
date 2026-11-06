import { describe, expect, it } from 'vitest';
import { migrationUrl } from './connection-config.js';

const direct = 'postgresql://user:secret@ep-app.example.neon.tech/db?sslmode=require';
describe('migration connection configuration', () => {
  it('accepts the single Neon branch direct URL', () => {
    expect(migrationUrl({ DATABASE_URL_DIRECT: direct })).toBe(direct);
  });
  it('rejects a pooled migration connection', () => {
    expect(() =>
      migrationUrl({ DATABASE_URL_DIRECT: direct.replace('ep-app.', 'ep-app-pooler.') }),
    ).toThrow('pooling off');
  });
  it('requires TLS for the hosted database', () => {
    expect(() =>
      migrationUrl({ DATABASE_URL_DIRECT: direct.replace('sslmode=require', 'sslmode=disable') }),
    ).toThrow('TLS enabled');
  });
  it('requires the migration URL', () => {
    expect(() => migrationUrl({})).toThrow('DATABASE_URL_DIRECT');
  });
});
