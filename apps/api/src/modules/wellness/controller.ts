import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  activityInputSchema,
  affirmationIdSchema,
  wellnessQuerySchema,
  type User,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { WellnessService } from './service.js';
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check your activity choices and timezone, then try again.',
    );
  return result.data;
}
const owner = (res: Response) => (res.locals.user as User).id;
export function createWellnessController(service: WellnessService) {
  return {
    async create(req: Request, res: Response) {
      const result = await service.create(owner(res), parse(activityInputSchema, req.body));
      res.status(result.created ? 201 : 200).json({ activity: result.activity });
    },
    async progress(req: Request, res: Response) {
      res.json(await service.progress(owner(res), parse(wellnessQuerySchema, req.query).timezone));
    },
    async daily(req: Request, res: Response) {
      res.json(await service.daily(owner(res), parse(wellnessQuerySchema, req.query).timezone));
    },
    async favorites(req: Request, res: Response) {
      parse(z.strictObject({}), req.query);
      res.json(await service.favorites(owner(res)));
    },
    async favorite(req: Request, res: Response) {
      await service.favorite(owner(res), parse(affirmationIdSchema, req.params.id));
      res.sendStatus(204);
    },
    async unfavorite(req: Request, res: Response) {
      await service.unfavorite(owner(res), parse(affirmationIdSchema, req.params.id));
      res.sendStatus(204);
    },
  };
}
