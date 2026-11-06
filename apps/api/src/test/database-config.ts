import { z } from 'zod';
import type { PoolConfig } from 'pg';

const schema = z.strictObject({
  host: z.literal('127.0.0.1'),
  port: z.number().int().min(1).max(65535),
  database: z.string().regex(/^solace_test_[a-f0-9]{32}$/),
  user: z.literal('solace_test'),
  password: z.string().regex(/^[a-f0-9]{64}$/),
});
export type TestDatabaseSettings = z.infer<typeof schema>;

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabase: TestDatabaseSettings;
  }
}

export function testDatabaseConfig(value: unknown): PoolConfig {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Tests require the disposable PostgreSQL container started by npm test.');
  }
  return {
    ...parsed.data,
    ssl: false, // Loopback-only disposable container; the runtime client still requires TLS.
    options: '',
    application_name: 'solace-tests',
    max: 5,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 5_000,
    statement_timeout: 5_000,
    query_timeout: 6_000,
  };
}
