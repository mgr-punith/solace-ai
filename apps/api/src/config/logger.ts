import { pino } from 'pino';

export function createLogger(level: string = 'info') {
  return pino({
    level,
    base: null,
    redact: {
      paths: [
        'authorization',
        'cookie',
        'password',
        'token',
        'DATABASE_URL',
        'DATABASE_URL_DIRECT',
        'DATABASE_URL_TEST',
        'LLM_API_KEY',
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  });
}
