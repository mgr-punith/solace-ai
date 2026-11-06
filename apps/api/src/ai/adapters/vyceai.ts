import { createOpenAICompatibleProvider } from './openai-compatible.js';

export function createVyceProvider(
  config: { baseUrl: string; apiKey: string; model: string },
  fetcher: typeof fetch = fetch,
) {
  return createOpenAICompatibleProvider(config, fetcher);
}
