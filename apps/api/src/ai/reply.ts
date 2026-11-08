import { z } from 'zod';
import { chatActivitySchema } from '@solace/shared';

export const llmReplySchema = z.strictObject({
  content: z.string().trim().min(1).max(1600),
  activity: chatActivitySchema.nullable(),
  needsSupport: z.boolean(),
});
export type LLMReply = z.infer<typeof llmReplySchema>;

// Groq strict mode requires all properties and disallows additional properties.
// Keep transport constraints simple; validate text bounds again on our server.
export const solReplyFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'sol_reply',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        activity: { type: ['string', 'null'], enum: [...chatActivitySchema.options, null] },
        needsSupport: { type: 'boolean' },
      },
      required: ['content', 'activity', 'needsSupport'],
      additionalProperties: false,
    },
  },
} as const;

export function parseReply(content: string): LLMReply {
  const value: unknown = JSON.parse(content);
  return llmReplySchema.parse(value);
}
