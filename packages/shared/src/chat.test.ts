import { expect, it } from 'vitest';
import { chatMessageSchema } from './chat.js';

const message = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  conversationId: '550e8400-e29b-41d4-a716-446655440001',
  requestId: 'request-id-for-test',
  sequence: 2,
  role: 'assistant',
  content: 'A short pause is here if you want one.',
  status: 'complete',
  kind: 'normal',
  createdAt: '2026-11-08T12:00:00Z',
};

it('reads old messages without activity metadata and preserves supported suggestions', () => {
  expect(chatMessageSchema.parse(message).content).toBe(message.content);
  for (const activity of ['breathing', 'affirmation', null])
    expect(chatMessageSchema.parse({ ...message, activity }).activity).toBe(activity);
});

it.each(['https://example.invalid', '/support', 'challenge', { route: '/breathing' }])(
  'keeps the reply readable but discards unsupported activity metadata: %s',
  (activity) => {
    const parsed = chatMessageSchema.parse({ ...message, activity });
    expect(parsed.content).toBe(message.content);
    expect(parsed.activity).toBeNull();
  },
);
