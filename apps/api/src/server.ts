import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { loadLocalEnv } from './config/load-env.js';
import { createLogger } from './config/logger.js';
import { createDatabase } from './db/client.js';
import { createAuthRepository } from './modules/auth/repository.js';
import { createAuthService } from './modules/auth/service.js';
import { createTokens } from './modules/auth/tokens.js';
import { createGoogleVerifier } from './modules/auth/google.js';

loadLocalEnv();
const env = parseEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const database = createDatabase(env.DATABASE_URL, logger);
const clock = () => new Date();
const auth = createAuthService({
  repository: createAuthRepository(database.pool),
  tokens: createTokens({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    clock,
  }),
  verifyGoogle: createGoogleVerifier(env.GOOGLE_WEB_CLIENT_ID),
  clock,
});
const app = createApp({
  checkDatabase: database.check,
  logger,
  corsOrigins: env.CORS_ORIGINS,
  auth,
  trustProxy: env.TRUST_PROXY,
});
const server = app.listen(env.PORT, env.HOST, () =>
  logger.info({ port: env.PORT }, 'API listening'),
);
server.on('error', () => {
  logger.error('API could not listen on the configured port');
  process.exit(1);
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  logger.info('Draining API connections');
  const deadline = setTimeout(() => {
    logger.error('Shutdown timed out');
    process.exit(1);
  }, 10_000);
  deadline.unref();
  server.close(() => {
    void database
      .close()
      .then(() => {
        clearTimeout(deadline);
        logger.info('API stopped');
      })
      .catch(() => {
        logger.error('Database shutdown failed');
        process.exitCode = 1;
      });
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
