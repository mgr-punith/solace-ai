import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { User } from '@solace/shared';
import type { AuthService } from '../auth/service.js';
import type { MoodService } from './service.js';
import { requireAuth } from '../../middleware/auth.js';
import { createMoodController } from './controller.js';
export function moodRoutes(auth: AuthService, service: MoodService) {
  const router = Router();
  const controller = createMoodController(service);
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
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.delete('/:id', controller.remove);
  return router;
}
