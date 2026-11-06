import { z } from 'zod';

export const chatRequestIdSchema = z
  .string()
  .min(16)
  .max(80)
  .regex(/^[a-zA-Z0-9-]+$/);
export const createConversationSchema = z.strictObject({ requestId: chatRequestIdSchema });
export const sendMessageSchema = z.strictObject({
  requestId: chatRequestIdSchema,
  content: z.string().trim().min(1).max(2000),
});
export const conversationSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const chatMessageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  requestId: chatRequestIdSchema,
  sequence: z.number().int().positive(),
  role: z.enum(['user', 'assistant']),
  content: z.string().max(8000),
  status: z.enum(['pending', 'complete', 'failed']),
  kind: z.enum(['normal', 'crisis', 'fallback']),
  createdAt: z.iso.datetime(),
});
export const conversationResponseSchema = z.object({ conversation: conversationSchema });
export const conversationPageSchema = z.object({
  items: z.array(conversationSchema),
  nextCursor: z.string().nullable(),
});
export const messagePageSchema = z.object({
  items: z.array(chatMessageSchema),
  nextCursor: z.string().nullable(),
});
export const sendResponseSchema = z.object({
  userMessage: chatMessageSchema,
  assistantMessage: chatMessageSchema,
});
export const chatPageQuerySchema = z.strictObject({
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});
export type Conversation = z.infer<typeof conversationSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ChatPageQuery = z.infer<typeof chatPageQuerySchema>;
