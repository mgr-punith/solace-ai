import { expect, it, vi } from 'vitest';
import { createLLMProvider } from './create-provider.js';

const config = {
  provider: 'groq' as const,
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: 'private-test-key',
  model: 'openai/gpt-oss-120b',
};
it('sends Groq GPT-OSS options and returns only final content', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'I hear you.',
              reasoning: 'private reasoning',
              reasoning_content: 'private reasoning',
            },
          },
        ],
      }),
    ),
  );
  expect(
    await createLLMProvider(config, fetcher).reply([{ role: 'user', content: 'A hard day' }]),
  ).toBe('I hear you.');
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  const options = fetcher.mock.calls[0]?.[1];
  expect(options?.headers).toMatchObject({ Authorization: 'Bearer private-test-key' });
  const body = JSON.parse(options?.body as string);
  expect(body).toMatchObject({
    model: config.model,
    reasoning_effort: 'low',
    include_reasoning: false,
    max_completion_tokens: 1024,
    stream: false,
  });
  expect(body).not.toHaveProperty('max_tokens');
  expect(body).not.toHaveProperty('tools');
});
it.each(['length', 'content_filter', 'tool_calls', undefined])(
  'rejects incomplete Groq responses: %s',
  async (finish_reason) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ finish_reason, message: { content: 'partial' } }] }),
        ),
      );
    await expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
      'Sol could not get a reply',
    );
  },
);
it('does not send a Groq key to a different host', () => {
  expect(() => createLLMProvider({ ...config, baseUrl: 'https://vyceai.com/v1' })).toThrow(
    'LLM_BASE_URL',
  );
});
it('keeps the VyceAi request format when explicitly selected', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Hello.' } }] })),
    );
  await createLLMProvider(
    { ...config, provider: 'vyceai', baseUrl: 'https://vyceai.com/v1', model: 'test-model' },
    fetcher,
  ).reply([]);
  const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
  expect(body.max_tokens).toBe(600);
  expect(body).not.toHaveProperty('reasoning_effort');
});
