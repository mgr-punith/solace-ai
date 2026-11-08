import { z } from 'zod';
import type { ChatPageQuery, SendMessageInput } from '@solace/shared';
import type { LLMProvider } from '../../ai/provider.js';
import { generateSolReply } from '../../ai/respond.js';
import { ApiError } from '../auth/errors.js';
import type { ConversationRepository } from './repository.js';
const missing = () =>
  new ApiError(404, 'CONVERSATION_NOT_FOUND', 'This conversation is no longer available.');
const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });
export function createConversationService({
  repository,
  provider,
  clock,
  onSafety = () => {},
}: {
  repository: ConversationRepository;
  provider: LLMProvider;
  clock: () => Date;
  onSafety?: () => void;
}) {
  return {
    create: (userId: string, requestId: string) => repository.create(userId, requestId, clock()),
    async get(userId: string, id: string) {
      const c = await repository.get(userId, id);
      if (!c) throw missing();
      return c;
    },
    async list(userId: string, query: ChatPageQuery) {
      let cursor = null;
      if (query.cursor)
        try {
          cursor = cursorSchema.parse(
            JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')),
          );
        } catch {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Refresh your conversation list and try again.',
          );
        }
      const rows = await repository.list(userId, query.limit, cursor);
      const items = rows.slice(0, query.limit);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          rows.length > query.limit && last
            ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString(
                'base64url',
              )
            : null,
      };
    },
    async messages(userId: string, id: string, query: ChatPageQuery) {
      if (!(await repository.get(userId, id))) throw missing();
      const before = query.cursor ? Number(query.cursor) : null;
      if (
        before !== null &&
        (!/^\d+$/.test(query.cursor!) || !Number.isSafeInteger(before) || before < 1)
      )
        throw new ApiError(400, 'VALIDATION_ERROR', 'Refresh this conversation and try again.');
      const rows = await repository.listMessages(userId, id, query.limit, before);
      const items = rows.slice(0, query.limit);
      return {
        items,
        nextCursor: rows.length > query.limit ? String(items.at(-1)!.sequence) : null,
      };
    },
    async remove(userId: string, id: string) {
      if (!(await repository.remove(userId, id))) throw missing();
    },
    async send(userId: string, id: string, input: SendMessageInput) {
      const claim = await repository.claim(userId, id, input, clock());
      if (claim.kind === 'missing') throw missing();
      if (claim.kind === 'conflict')
        throw new ApiError(
          409,
          'MESSAGE_CONFLICT',
          'This message was already saved with different text. Reopen the conversation.',
        );
      if (claim.kind === 'stale')
        throw new ApiError(
          409,
          'MESSAGE_STALE',
          'A newer message is already saved. Continue the conversation instead.',
        );
      if (claim.kind === 'busy')
        throw new ApiError(
          409,
          'REPLY_PENDING',
          'A reply is still being prepared. Wait a moment, then retry the saved message.',
        );
      if (claim.kind === 'existing')
        return { userMessage: claim.userMessage, assistantMessage: claim.assistantMessage };
      const reply = await generateSolReply({
        provider,
        message: input.content,
        context: () => repository.context(userId, id),
      });
      if (reply.kind === 'crisis') onSafety();
      const result = await repository.finish(
        userId,
        id,
        input.requestId,
        claim.leaseId,
        reply.content,
        reply.kind,
        clock(),
        reply.activity,
      );
      if (!result) throw missing();
      return result;
    },
  };
}
export type ConversationService = ReturnType<typeof createConversationService>;
