import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { User } from '@solace/shared';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthService } from '../auth/service.js';
import type { QuestionnaireService } from './service.js';
import { createQuestionnaireController } from './controller.js';

export function questionnaireRoutes(auth: AuthService, service: QuestionnaireService) {
  const router = Router();
  const controller = createQuestionnaireController(service);
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth(auth));
  router.use(
    rateLimit({
      windowMs: 60_000,
      limit: 45,
      keyGenerator: (_req, res) => (res.locals.user as User).id,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Take a moment, then try again.' } },
    }),
  );
  router.get('/', controller.today);
  router.put('/:day', controller.save);
  return router;
}
