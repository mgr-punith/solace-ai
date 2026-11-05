import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthService } from './service.js';
import { createAuthController } from './controller.js';

export function authRoutes(service: AuthService) {
  const router = Router();
  const controller = createAuthController(service);
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many sign-in attempts. Try again in a minute.',
        },
      },
    }),
  );
  router.post('/auth/google', controller.google);
  router.post('/auth/refresh', controller.refresh);
  router.post('/auth/logout', controller.logout);
  router.get('/me', controller.me);
  router.delete('/me', controller.deleteAccount);
  return router;
}
