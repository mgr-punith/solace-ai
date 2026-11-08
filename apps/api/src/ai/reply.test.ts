import { expect, it } from 'vitest';
import { parseReply } from './reply.js';

it('extracts bounded reply text and the supported activity from structured output', () => {
  expect(
    parseReply(
      JSON.stringify({
        content: ' A pause is here if you want. ',
        activity: 'breathing',
        needsSupport: false,
      }),
    ),
  ).toEqual({
    content: 'A pause is here if you want.',
    activity: 'breathing',
    needsSupport: false,
  });
});

it.each([
  'Unstructured text',
  '```json\n{"content":"Hello"}\n```',
  JSON.stringify({ content: 'Hello', activity: '/breathing', needsSupport: false }),
  JSON.stringify({ content: 'Hello', activity: 'challenge', needsSupport: false }),
  JSON.stringify({ content: '', activity: null, needsSupport: false }),
  JSON.stringify({ content: 'x'.repeat(1601), activity: null, needsSupport: false }),
  JSON.stringify({ content: 'Hello', activity: null, needsSupport: 'false' }),
  JSON.stringify({ content: 'Hello', activity: null }),
  JSON.stringify({
    content: 'Hello',
    activity: null,
    needsSupport: false,
    route: '/delete-account',
  }),
])('rejects malformed output instead of showing raw instructions: %s', (value) => {
  expect(() => parseReply(value)).toThrow();
});
