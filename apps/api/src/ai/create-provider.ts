import type { ChatProvider } from '@solace/shared';
import { createOpenAICompatibleProvider } from './adapters/openai-compatible.js';

export function createLLMProvider(
  config: { provider: ChatProvider; baseUrl: string; apiKey: string; model: string },
  fetcher: typeof fetch = fetch,
) {
  if (
    config.provider === 'groq' &&
    config.baseUrl.replace(/\/$/, '') !== 'https://api.groq.com/openai/v1'
  )
    throw new Error('LLM_BASE_URL must match Groq.');
  return createOpenAICompatibleProvider(
    { ...config, groqReasoning: config.provider === 'groq' },
    fetcher,
  );
}
