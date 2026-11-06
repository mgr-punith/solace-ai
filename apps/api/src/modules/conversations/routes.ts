import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { User } from '@solace/shared';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthService } from '../auth/service.js';
import type { ConversationService } from './service.js';
import { createConversationController } from './controller.js';
export function conversationRoutes(auth: AuthService, service: ConversationService) {
  const router = Router();
  const controller = createConversationController(service);
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth(auth));
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 15,
    keyGenerator: (_req, res) => (res.locals.user as User).id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Take a moment, then try again.' } },
  });
  router.post('/', limit, controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.get('/:id/messages', controller.messages);
  router.post('/:id/messages', limit, controller.send);
  router.delete('/:id', controller.remove);
  return router;
}
