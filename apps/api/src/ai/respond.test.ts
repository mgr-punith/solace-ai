import { beforeEach, expect, it, vi } from 'vitest';
import type { LLMProvider } from './provider.js';
import { generateSolReply } from './respond.js';
import { crisisReply, unavailableReply } from './safety/crisis.js';

const reply = vi.fn<LLMProvider['reply']>();
const provider = { reply };
beforeEach(() => {
  reply.mockReset();
});

it('skips the provider and context lookup for a deterministic crisis', async () => {
  const context = vi.fn();
  expect(await generateSolReply({ provider, message: 'I want to kill myself', context })).toEqual({
    content: crisisReply,
    kind: 'crisis',
    activity: null,
  });
  expect(context).not.toHaveBeenCalled();
  expect(reply).not.toHaveBeenCalled();
});

it('uses the safe crisis response when the provider flags less explicit danger', async () => {
  reply.mockResolvedValue({
    content: 'Untrusted provider advice.',
    activity: 'breathing',
    needsSupport: true,
  });
  const message = 'I have everything ready and tonight is the night.';
  expect(
    await generateSolReply({
      provider,
      message,
      context: async () => [{ role: 'user', content: message }],
    }),
  ).toEqual({
    content: crisisReply,
    kind: 'crisis',
    activity: null,
  });
});

it('returns a normal optional activity but does not repeat an invitation on adjacent replies', async () => {
  reply.mockResolvedValue({
    content: 'We can take a short pause.',
    activity: 'breathing',
    needsSupport: false,
  });
  const message = 'I could use a pause.';
  const initial = await generateSolReply({
    provider,
    message,
    context: async () => [{ role: 'user', content: message }],
  });
  expect(initial).toEqual({
    content: 'We can take a short pause.',
    kind: 'normal',
    activity: 'breathing',
  });
  const next = await generateSolReply({
    provider,
    message: 'I would rather keep talking.',
    context: async () => [
      { role: 'user', content: message },
      { role: 'assistant', ...initial },
      { role: 'user', content: 'I would rather keep talking.' },
    ],
  });
  expect(next.activity).toBeNull();
});

it('suppresses activities immediately after a crisis even when the provider offers one', async () => {
  reply.mockResolvedValue({
    content: 'I am here to listen.',
    activity: 'affirmation',
    needsSupport: false,
  });
  const result = await generateSolReply({
    provider,
    message: 'Stay here.',
    context: async () => [
      { role: 'assistant', content: crisisReply, kind: 'crisis', activity: null },
      { role: 'user', content: 'Stay here.' },
    ],
  });
  expect(result.activity).toBeNull();
});

it('keeps provider failures content-free and recoverable without an activity', async () => {
  reply.mockRejectedValue(new Error('private upstream detail'));
  expect(
    await generateSolReply({
      provider,
      message: 'Hello',
      context: async () => [{ role: 'user', content: 'Hello' }],
    }),
  ).toEqual({
    content: unavailableReply,
    kind: 'fallback',
    activity: null,
  });
});
