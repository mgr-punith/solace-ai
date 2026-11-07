import { wellnessRoutes } from './modules/wellness/routes.js';
import type { WellnessService } from './modules/wellness/service.js';
import { conversationRoutes } from './modules/conversations/routes.js';
import { reminderRoutes } from './modules/reminders/routes.js';
import type { ReminderService } from './modules/reminders/service.js';
import type { ConversationService } from './modules/conversations/service.js';
import type { MoodService } from './modules/mood/service.js';
import { moodRoutes } from './modules/mood/routes.js';
import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { Logger } from 'pino';
import type { HealthResponse, ReadyResponse, ErrorResponse, ChatProvider } from '@solace/shared';
import type { AuthService } from './modules/auth/service.js';
import { authRoutes } from './modules/auth/routes.js';
import { ApiError } from './modules/auth/errors.js';

type AppDependencies = {
  checkDatabase: () => Promise<void>;
  logger: Logger;
  corsOrigins?: string[];
  auth?: AuthService;
  mood?: MoodService;
  chat?: ConversationService;
  reminders?: ReminderService;
  wellness?: WellnessService;
  chatProvider?: ChatProvider;
  trustProxy?: number;
};

export function createApp({
  checkDatabase,
  logger,
  corsOrigins = [],
  auth,
  mood,
  chat,
  reminders,
  wellness,
  chatProvider,
  trustProxy = 0,
}: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', trustProxy);
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.locals.requestId = requestId;
    res.on('finish', () => {
      // Never log query strings, message bodies, headers, or IP addresses.
      logger.info(
        {
          requestId,
          method: req.method,
          statusCode: res.statusCode,
          route: ['/health', '/ready'].includes(req.path) ? req.path : 'other',
        },
        'Request completed',
      );
    });
    next();
  });
  app.use(helmet());
  app.use(
    cors({ origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], maxAge: 600 }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' },
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' } satisfies HealthResponse);
  });
  app.get('/ready', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'connected' } satisfies ReadyResponse);
    } catch {
      logger.warn({ requestId: res.locals.requestId }, 'Database readiness check failed');
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'The service is not ready. Try again shortly.',
        },
      } satisfies ErrorResponse);
    }
  });
  if (chatProvider)
    app.get('/v1/chat-provider', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({ provider: chatProvider });
    });
  if (auth) app.use('/v1', authRoutes(auth));
  if (auth && mood) app.use('/v1/mood-checkins', moodRoutes(auth, mood));
  if (auth && chat) app.use('/v1/conversations', conversationRoutes(auth, chat));
  if (auth && reminders) app.use('/v1/reminders', reminderRoutes(auth, reminders));
  if (auth && wellness) app.use('/v1', wellnessRoutes(auth, wellness));
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'This endpoint does not exist.' },
    } satisfies ErrorResponse);
  });
  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof ApiError) {
      res
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } } satisfies ErrorResponse);
      return;
    }
    const kind =
      typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
    const status = kind === 'entity.too.large' ? 413 : kind === 'entity.parse.failed' ? 400 : 500;
    const code =
      status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR';
    const message =
      status === 413
        ? 'The request is too large.'
        : status === 400
          ? 'The request must contain valid JSON.'
          : 'Something went wrong. Try again shortly.';
    logger.warn({ requestId: res.locals.requestId, code }, 'Request failed');
    res.status(status).json({ error: { code, message } } satisfies ErrorResponse);
  };
  app.use(handleError);
  return app;
}
