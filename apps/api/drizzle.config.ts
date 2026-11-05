import { defineConfig } from 'drizzle-kit';
import { loadLocalEnv } from './src/config/load-env.js';
import { migrationUrl } from './src/db/connection-config.js';

loadLocalEnv();
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url: migrationUrl(process.env) },
});
