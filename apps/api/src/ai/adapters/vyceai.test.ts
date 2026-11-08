import { afterEach, expect, it, vi } from 'vitest';
import { createVyceProvider } from './vyceai.js';
const config = {
  baseUrl: 'https://vyceai.com/v1',
  apiKey: 'test-private-key',
  model: 'test-model',
};
const replyContent = (content: string) =>
  JSON.stringify({ content, activity: null, needsSupport: false });
it('uses documented bearer authentication and validates a bounded structured reply', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: replyContent('I hear you.') } }] }),
      ),
    );
  expect(
    await createVyceProvider(config, fetcher).reply([{ role: 'user', content: 'Hello' }]),
  ).toEqual({ content: 'I hear you.', activity: null, needsSupport: false });
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://vyceai.com/v1/chat/completions');
  const options = fetcher.mock.calls[0]?.[1];
  expect(options?.redirect).toBe('error');
  expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-private-key' });
  expect(JSON.parse(options?.body as string)).toMatchObject({
    model: 'test-model',
    stream: false,
    max_tokens: 600,
  });
});
it('retries a transient response once and hides provider errors', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('private-provider-detail', { status: 503 }));
  await expect(createVyceProvider(config, fetcher).reply([])).rejects.toThrow(
    /^Sol could not get a reply from the AI provider\.$/,
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each([
  new Response('{}'),
  new Response(JSON.stringify({ choices: [{ message: { content: 'x'.repeat(9000) } }] })),
  new Response('private', { status: 401 }),
])('rejects invalid or unauthorized replies', async (response) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  await expect(createVyceProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('never sends keys over HTTP', () =>
  expect(() => createVyceProvider({ ...config, baseUrl: 'http://example.invalid' })).toThrow(
    'HTTPS',
  ));

afterEach(() => vi.useRealTimers());

function respondAfter(ms: number, response: () => Response): typeof fetch {
  return (_input, options) =>
    new Promise<Response>((resolve, reject) => {
      const signal = options?.signal;
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Timed out', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve(response());
      }, ms);
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    });
}

it('allows a valid 16-second reply instead of returning an early fallback', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>(
    respondAfter(
      16_000,
      () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: replyContent('Hello. How was studying?') } }],
          }),
        ),
    ),
  );
  const result = expect(createVyceProvider(config, fetcher).reply([])).resolves.toEqual({
    content: 'Hello. How was studying?',
    activity: null,
    needsSupport: false,
  });
  await vi.advanceTimersByTimeAsync(16_000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('caps a slow retry at 45 seconds for the whole operation', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(respondAfter(30_000, () => new Response('', { status: 503 })))
    .mockImplementation(respondAfter(30_000, () => new Response('{}')));
  let settled = false;
  const reply = createVyceProvider(config, fetcher)
    .reply([])
    .finally(() => {
      settled = true;
    });
  const result = expect(reply).rejects.toThrow('Sol could not get a reply');
  await vi.advanceTimersByTimeAsync(30_400);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(14_599);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await result;
  expect(vi.getTimerCount()).toBe(0);
});

it('aborts a stalled response body at the same deadline and hides raw errors', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async (_input, options) =>
      new Response(
        new ReadableStream({
          start(controller) {
            options?.signal?.addEventListener(
              'abort',
              () => {
                controller.error(new Error('private upstream detail'));
              },
              { once: true },
            );
          },
        }),
      ),
  );
  const result = expect(createVyceProvider(config, fetcher).reply([])).rejects.toThrow(
    /^Sol could not get a reply from the AI provider\.$/,
  );
  await vi.advanceTimersByTimeAsync(45_000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('honors a bounded Retry-After and then succeeds', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '2' } }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: replyContent('Hello.') } }] })),
    );
  const result = expect(createVyceProvider(config, fetcher).reply([])).resolves.toEqual({
    content: 'Hello.',
    activity: null,
    needsSupport: false,
  });
  await vi.advanceTimersByTimeAsync(1999);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
it('aborts during retry backoff without starting another request', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>(
    respondAfter(44_800, () => new Response('', { status: 503 })),
  );
  const result = expect(createVyceProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  await vi.advanceTimersByTimeAsync(45_000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it('does not retry a quota that needs more than the request deadline to reset', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '60' } }));
  await expect(createVyceProvider(config, fetcher).reply([])).rejects.toThrow(
    'Sol could not get a reply',
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
