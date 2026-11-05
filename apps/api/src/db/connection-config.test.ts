import { describe, expect, it } from 'vitest';
import { migrationUrl, testDatabaseUrl } from './connection-config.js';

const direct = 'postgresql://user:secret@ep-dev.example.neon.tech/db?sslmode=require';
const source = {
  DATABASE_URL: direct.replace('ep-dev.', 'ep-dev-pooler.'),
  DATABASE_URL_DIRECT: direct,
  DATABASE_URL_TEST: direct.replace('ep-dev.', 'ep-test.'),
};
describe('database isolation guard', () => {
  it('accepts a distinct test endpoint', () =>
    expect(testDatabaseUrl(source)).toBe(source.DATABASE_URL_TEST));
  it('rejects the dev endpoint even with different credentials or database name', () => {
    expect(() =>
      testDatabaseUrl({ ...source, DATABASE_URL_TEST: direct.replace('/db?', '/test?') }),
    ).toThrow('separate Neon branch');
  });
  it('rejects a pooled migration connection', () => {
    expect(() => migrationUrl({ DATABASE_URL_DIRECT: source.DATABASE_URL })).toThrow('pooling off');
  });
  it('requires the test branch instead of silently skipping integration tests', () => {
    expect(() => testDatabaseUrl({ ...source, DATABASE_URL_TEST: '' })).toThrow(
      'DATABASE_URL_TEST',
    );
  });
});
