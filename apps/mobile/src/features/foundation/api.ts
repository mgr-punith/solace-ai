import { readyResponseSchema, type ReadyResponse } from '@solace/shared';

export async function checkConnection(baseUrl: string | undefined): Promise<ReadyResponse> {
  if (!baseUrl)
    throw new Error('Set EXPO_PUBLIC_API_URL in apps/mobile/.env, then restart the app server.');
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('The server address is invalid. Check the app configuration.');
  }
  if (url.protocol !== 'https:')
    throw new Error('Use an HTTPS server address to protect your connection.');
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(new URL('/ready', url).toString(), { signal: controller.signal });
    if (!response.ok) throw new Error('The server is not ready. Please try again shortly.');
    const parsed = readyResponseSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new Error('The server sent an unexpected response. Please try again.');
    return parsed.data;
  } catch (error) {
    if (
      error instanceof Error &&
      [
        'The server is not ready. Please try again shortly.',
        'The server sent an unexpected response. Please try again.',
      ].includes(error.message)
    )
      throw error;
    throw new Error('Cannot reach Solace right now. Check your connection and try again.');
  } finally {
    clearTimeout(deadline);
  }
}
