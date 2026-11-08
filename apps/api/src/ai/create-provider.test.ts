import { afterEach, expect, it, vi } from 'vitest';
import { createLLMProvider } from './create-provider.js';
import { generateSolReply } from './respond.js';
import { crisisReply } from './safety/crisis.js';

const config = {
  provider: 'groq' as const,
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: 'private-test-key',
  model: 'openai/gpt-oss-120b',
};
afterEach(() => vi.useRealTimers());

const formatFailure = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 'json_validate_failed',
        message: 'private provider detail',
        failed_generation: 'Never show this unvalidated reply.',
      },
    }),
    { status: 400 },
  );
const completeReply = (needsSupport = false) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              content: 'What happened during your day?',
              activity: null,
              needsSupport,
            }),
          },
        },
      ],
    }),
  );
it('sends Groq GPT-OSS options and returns only final content', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                content: 'I hear you.',
                activity: null,
                needsSupport: false,
              }),
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
  ).toEqual({ content: 'I hear you.', activity: null, needsSupport: false });
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
    response_format: {
      type: 'json_schema',
      json_schema: {
        strict: true,
        schema: {
          additionalProperties: false,
          required: ['content', 'activity', 'needsSupport'],
        },
      },
    },
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
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({ content: 'Hello.', activity: null, needsSupport: false }),
            },
          },
        ],
      }),
    ),
  );
  await createLLMProvider(
    { ...config, provider: 'vyceai', baseUrl: 'https://vyceai.com/v1', model: 'test-model' },
    fetcher,
  ).reply([]);
  const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
  expect(body.max_tokens).toBe(600);
  expect(body).not.toHaveProperty('reasoning_effort');
  expect(body).not.toHaveProperty('response_format');
});

it('rejects a well-formed transport reply containing an untrusted activity', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                content: 'Try this.',
                activity: 'https://example.invalid',
                needsSupport: false,
              }),
            },
          },
        ],
      }),
    ),
  );
  await expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('recovers one Groq format failure while retaining the strict schema and same request', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(formatFailure())
    .mockResolvedValueOnce(completeReply());
  const result = expect(
    createLLMProvider(config, fetcher).reply([{ role: 'user', content: 'Hello' }]),
  ).resolves.toEqual({
    content: 'What happened during your day?',
    activity: null,
    needsSupport: false,
  });
  await vi.advanceTimersByTimeAsync(399);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]).toEqual(fetcher.mock.calls[0]);
  expect(
    JSON.parse(fetcher.mock.calls[1]![1]!.body as string).response_format.json_schema.strict,
  ).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('stops after two format failures and never exposes the failed generation', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => formatFailure());
  const result = expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    /^Sol could not get a reply from the AI provider\.$/,
  );
  await vi.advanceTimersByTimeAsync(400);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  JSON.stringify({ error: { code: 'invalid_request_error' } }),
  JSON.stringify({ error: { message: 'json_validate_failed' } }),
  'not-json',
  JSON.stringify({ error: { code: 'json_validate_failed', failed_generation: 'x'.repeat(64000) } }),
])('does not retry other or unreadable Groq 400 responses (%#)', async (body) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 400 }));
  await expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('keeps format failures from other providers outside Groq retry handling', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(formatFailure());
  await expect(
    createLLMProvider(
      { ...config, provider: 'vyceai', baseUrl: 'https://vyceai.com/v1' },
      fetcher,
    ).reply([]),
  ).rejects.toThrow('Sol could not get a reply');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('shares the two-attempt limit between rate-limit and format errors', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('', { status: 429 }))
    .mockResolvedValueOnce(formatFailure())
    .mockResolvedValueOnce(completeReply());
  const result = expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  await vi.advanceTimersByTimeAsync(400);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it('does not let format retry backoff extend the shared 45-second deadline', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(formatFailure()), 44800)),
    );
  const result = expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  await vi.advanceTimersByTimeAsync(45000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('aborts a stalled Groq error body within the same deadline', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async (_input, options) =>
      new Response(
        new ReadableStream({
          start(controller) {
            options?.signal?.addEventListener(
              'abort',
              () => controller.error(new Error('private detail')),
              { once: true },
            );
          },
        }),
        { status: 400 },
      ),
  );
  const result = expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    /^Sol could not get a reply from the AI provider\.$/,
  );
  await vi.advanceTimersByTimeAsync(45000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('validates recovered output before displaying any reply or activity', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(formatFailure())
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  content: 'Open this.',
                  activity: '/delete-account',
                  needsSupport: false,
                }),
              },
            },
          ],
        }),
      ),
    );
  const result = expect(createLLMProvider(config, fetcher).reply([])).rejects.toThrow(
    /^Sol could not get a reply from the AI provider\.$/,
  );
  await vi.advanceTimersByTimeAsync(400);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('still uses crisis support when the recovered reply flags danger', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(formatFailure())
    .mockResolvedValueOnce(completeReply(true));
  const message = 'Stay with me.';
  const result = expect(
    generateSolReply({
      provider: createLLMProvider(config, fetcher),
      message,
      context: async () => [{ role: 'user', content: message }],
    }),
  ).resolves.toEqual({ content: crisisReply, kind: 'crisis', activity: null });
  await vi.advanceTimersByTimeAsync(400);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
});
