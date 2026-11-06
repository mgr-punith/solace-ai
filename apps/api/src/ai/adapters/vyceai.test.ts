import { expect, it, vi } from 'vitest';
import { createVyceProvider } from './vyceai.js';
const config = {
  baseUrl: 'https://vyceai.com/v1',
  apiKey: 'test-private-key',
  model: 'test-model',
};
it('uses documented bearer authentication and validates a bounded plain-text reply', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'I hear you.' } }] })),
    );
  expect(
    await createVyceProvider(config, fetcher).reply([{ role: 'user', content: 'Hello' }]),
  ).toBe('I hear you.');
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
