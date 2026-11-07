import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { User } from '@solace/shared';
import type { AuthService } from '../auth/service.js';
import { requireAuth } from '../../middleware/auth.js';
import { createReminderController } from './controller.js';
import type { ReminderService } from './service.js';
export function reminderRoutes(auth: AuthService, service: ReminderService) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth(auth));
  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      keyGenerator: (_req, res) => (res.locals.user as User).id,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Take a moment, then try again.' } },
    }),
  );
  const controller = createReminderController(service);
  router.get('/', controller.get);
  router.put('/', controller.save);
  return router;
}
