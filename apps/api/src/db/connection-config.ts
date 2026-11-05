import { databaseUrlSchema } from '../config/env.js';

function requireUrl(value: string | undefined, name: string): string {
  const parsed = databaseUrlSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(`${name} must be a PostgreSQL connection URL with TLS enabled.`);
  return parsed.data;
}

function endpoint(value: string): string {
  return new URL(value).hostname.replace('-pooler.', '.');
}

export function migrationUrl(source: NodeJS.ProcessEnv): string {
  const direct = requireUrl(source.DATABASE_URL_DIRECT, 'DATABASE_URL_DIRECT');
  if (new URL(direct).hostname.includes('-pooler.'))
    throw new Error('Migrations require a direct connection, with pooling off.');
  return direct;
}

export function testDatabaseUrl(source: NodeJS.ProcessEnv): string {
  const test = requireUrl(source.DATABASE_URL_TEST, 'DATABASE_URL_TEST');
  const development = requireUrl(source.DATABASE_URL, 'DATABASE_URL');
  const direct = migrationUrl(source);
  if (new URL(test).hostname.includes('-pooler.'))
    throw new Error('DATABASE_URL_TEST must use its direct connection.');
  if ([development, direct].some((url) => endpoint(url) === endpoint(test))) {
    throw new Error(
      'DATABASE_URL_TEST must use a separate Neon branch endpoint. Refusing to touch development data.',
    );
  }
  return test;
}
