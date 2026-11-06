import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  chatPageQuerySchema,
  createConversationSchema,
  sendMessageSchema,
  type User,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { ConversationService } from './service.js';
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check your message and try again (up to 2,000 characters).',
    );
  return r.data;
}
const owner = (res: Response) => (res.locals.user as User).id;
export function createConversationController(service: ConversationService) {
  return {
    async create(req: Request, res: Response) {
      const input = parse(createConversationSchema, req.body);
      const conversation = await service.create(owner(res), input.requestId);
      res.status(201).location(`/v1/conversations/${conversation.id}`).json({ conversation });
    },
    async list(req: Request, res: Response) {
      res.json(await service.list(owner(res), parse(chatPageQuerySchema, req.query)));
    },
    async get(req: Request, res: Response) {
      res.json({ conversation: await service.get(owner(res), parse(z.uuid(), req.params.id)) });
    },
    async messages(req: Request, res: Response) {
      res.json(
        await service.messages(
          owner(res),
          parse(z.uuid(), req.params.id),
          parse(chatPageQuerySchema, req.query),
        ),
      );
    },
    async send(req: Request, res: Response) {
      res.json(
        await service.send(
          owner(res),
          parse(z.uuid(), req.params.id),
          parse(sendMessageSchema, req.body),
        ),
      );
    },
    async remove(req: Request, res: Response) {
      await service.remove(owner(res), parse(z.uuid(), req.params.id));
      res.sendStatus(204);
    },
  };
}
