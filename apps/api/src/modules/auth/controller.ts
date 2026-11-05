import { googleSignInSchema, refreshRequestSchema } from '@solace/shared';
import { z } from 'zod';
import type { Request, Response } from 'express';
import type { AuthService } from './service.js';
import { ApiError, unauthenticated } from './errors.js';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(400, 'VALIDATION_ERROR', 'Check the request fields and try again.');
  return parsed.data;
}
async function current(req: Request, service: AuthService) {
  const header = req.get('Authorization');
  if (!header || !/^Bearer [^\s]+$/.test(header)) throw unauthenticated();
  return service.authenticate(header.slice(7));
}
export function createAuthController(service: AuthService) {
  return {
    async google(req: Request, res: Response) {
      const input = parse(googleSignInSchema, req.body);
      res.json(await service.google(input.idToken));
    },
    async refresh(req: Request, res: Response) {
      const input = parse(refreshRequestSchema, req.body);
      res.json(await service.refresh(input.refreshToken));
    },
    async logout(req: Request, res: Response) {
      const input = parse(refreshRequestSchema, req.body);
      await service.logout(input.refreshToken);
      res.sendStatus(204);
    },
    async me(req: Request, res: Response) {
      res.json({ user: await current(req, service) });
    },
    async deleteAccount(req: Request, res: Response) {
      parse(z.strictObject({}), req.body ?? {});
      const person = await current(req, service);
      await service.deleteAccount(person.id);
      res.sendStatus(204);
    },
  };
}
