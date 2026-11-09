import type { Request, Response } from 'express';
import type { z } from 'zod';
import {
  questionnaireDaySchema,
  questionnaireInputSchema,
  questionnaireQuerySchema,
  type User,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { QuestionnaireService } from './service.js';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(400, 'VALIDATION_ERROR', 'Check your four answers and try again.');
  return result.data;
}
export function createQuestionnaireController(service: QuestionnaireService) {
  const owner = (res: Response) => (res.locals.user as User).id;
  return {
    async today(req: Request, res: Response) {
      res.json(
        await service.today(owner(res), parse(questionnaireQuerySchema, req.query).timezone),
      );
    },
    async save(req: Request, res: Response) {
      const result = await service.save(
        owner(res),
        parse(questionnaireDaySchema, req.params.day),
        parse(questionnaireInputSchema, req.body),
      );
      res.status(result.created ? 201 : 200).json(result.result);
    },
  };
}
