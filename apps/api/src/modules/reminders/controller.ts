import type { Request, Response } from 'express';
import { reminderSettingsSchema, type User } from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { ReminderService } from './service.js';
const owner = (res: Response) => (res.locals.user as User).id;
export function createReminderController(service: ReminderService) {
  return {
    async get(_req: Request, res: Response) {
      res.json({ settings: await service.get(owner(res)) });
    },
    async save(req: Request, res: Response) {
      const result = reminderSettingsSchema.safeParse(req.body);
      if (!result.success)
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Check reminder times, days and quiet hours, then try again.',
        );
      res.json({ settings: await service.save(owner(res), result.data) });
    },
  };
}
