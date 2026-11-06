import type { RequestHandler } from 'express';
import type { AuthService } from '../modules/auth/service.js';
import { unauthenticated } from '../modules/auth/errors.js';
export function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const header = req.get('Authorization');
    if (!header || !/^Bearer [^\s]+$/.test(header)) throw unauthenticated();
    res.locals.user = await auth.authenticate(header.slice(7));
    next();
  };
}
