import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { User } from '@solace/shared';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthService } from '../auth/service.js';
import type { WellnessService } from './service.js';
import { createWellnessController } from './controller.js';
export function wellnessRoutes(auth: AuthService, service: WellnessService) {
  const router = Router();
  const controller = createWellnessController(service);
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
  router.post('/activities', controller.create);
  router.get('/progress', controller.progress);
  router.get('/wellness/today', controller.daily);
  router.get('/affirmation-favorites', controller.favorites);
  router.put('/affirmation-favorites/:id', controller.favorite);
  router.delete('/affirmation-favorites/:id', controller.unfavorite);
  return router;
}
