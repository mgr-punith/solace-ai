import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadLocalEnv } from '../config/load-env.js';
import { createLogger } from '../config/logger.js';
import { createDatabase } from './client.js';
import { migrationUrl } from './connection-config.js';

const logger = createLogger();
let database: ReturnType<typeof createDatabase> | undefined;
try {
  loadLocalEnv();
  database = createDatabase(migrationUrl(process.env), logger);
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)),
  });
  logger.info('Database migrations applied');
} catch {
  logger.error('Migration failed. Check the direct database configuration and connectivity.');
  process.exitCode = 1;
} finally {
  await database?.close();
}
