import { databaseUrlSchema } from '../config/env.js';

function requireUrl(value: string | undefined, name: string): string {
  const parsed = databaseUrlSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(`${name} must be a PostgreSQL connection URL with TLS enabled.`);
  return parsed.data;
}

export function migrationUrl(source: NodeJS.ProcessEnv): string {
  const direct = requireUrl(source.DATABASE_URL_DIRECT, 'DATABASE_URL_DIRECT');
  if (new URL(direct).hostname.includes('-pooler.'))
    throw new Error('Migrations require a direct connection, with pooling off.');
  return direct;
}
