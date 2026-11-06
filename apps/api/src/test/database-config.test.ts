import { describe, expect, it } from 'vitest';
import { testDatabaseConfig } from './database-config.js';

const config = {
  host: '127.0.0.1',
  port: 49152,
  database: `solace_test_${'a'.repeat(32)}`,
  user: 'solace_test',
  password: 'b'.repeat(64),
};

describe('disposable test database guard', () => {
  it('accepts only the runner-provided loopback database with explicit transport settings', () => {
    expect(testDatabaseConfig(config)).toMatchObject({ ...config, ssl: false, max: 5 });
  });
  it.each([
    { ...config, host: 'ep-app.neon.tech' },
    { ...config, host: '0.0.0.0' },
    { ...config, database: 'neondb' },
    { ...config, port: 0 },
    { ...config, connectionString: 'postgresql://example.invalid/neondb' },
    { ...config, options: '-c search_path=public' },
    undefined,
  ])('rejects unsafe or missing settings without falling back to environment URLs', (value) => {
    expect(() => testDatabaseConfig(value)).toThrow('disposable PostgreSQL');
  });
  it('does not include rejected credentials in the error', () => {
    expect(() => testDatabaseConfig({ ...config, host: 'remote', password: 'do-not-log' })).toThrow(
      /^Tests require the disposable PostgreSQL container started by npm test\.$/,
    );
  });
});
