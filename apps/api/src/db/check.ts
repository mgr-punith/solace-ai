import { loadLocalEnv } from '../config/load-env.js';
import { databaseUrlSchema } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { createDatabase } from './client.js';

loadLocalEnv();
const logger = createLogger('silent');
for (const name of ['DATABASE_URL', 'DATABASE_URL_DIRECT'] as const) {
  const parsed = databaseUrlSchema.safeParse(process.env[name]);
  if (!parsed.success) {
    process.stdout.write(`${name}: missing or invalid PostgreSQL URL\n`);
    process.exitCode = 1;
    continue;
  }
  const database = createDatabase(parsed.data, logger);
  try {
    await database.check();
    process.stdout.write(`${name}: connected\n`);
  } catch (error) {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : 'CONNECTION_FAILED';
    process.stdout.write(`${name}: ${code}\n`);
    process.exitCode = 1;
  } finally {
    await database.close();
  }
}
