import type { Request, Response } from 'express';
import { z } from 'zod';
import { moodInputSchema, moodQuerySchema, type User } from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { MoodService } from './service.js';
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check your mood, tags, note and timezone, then try again.',
    );
  return parsed.data;
}
const owner = (res: Response) => (res.locals.user as User).id;
export function createMoodController(service: MoodService) {
  return {
    async create(req: Request, res: Response) {
      const result = await service.create(owner(res), parse(moodInputSchema, req.body));
      res
        .location(`/v1/mood-checkins/${result.checkin.id}`)
        .status(result.created ? 201 : 200)
        .json({ checkin: result.checkin });
    },
    async list(req: Request, res: Response) {
      res.json(await service.list(owner(res), parse(moodQuerySchema, req.query)));
    },
    async get(req: Request, res: Response) {
      res.json({ checkin: await service.get(owner(res), parse(z.uuid(), req.params.id)) });
    },
    async remove(req: Request, res: Response) {
      await service.remove(owner(res), parse(z.uuid(), req.params.id));
      res.sendStatus(204);
    },
  };
}
