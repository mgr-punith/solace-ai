import { z } from 'zod';
import type { LLMProvider } from '../provider.js';
import { setTimeout as delay } from 'node:timers/promises';
const responseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().trim().min(1).max(8000) }) }))
    .min(1),
});
export function createVyceProvider(
  config: { baseUrl: string; apiKey: string; model: string },
  fetcher: typeof fetch = fetch,
): LLMProvider {
  const base = new URL(config.baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    throw new Error('LLM_BASE_URL must be a plain HTTPS URL.');
  return {
    async reply(messages) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetcher(`${base.toString().replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(12_000),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages,
              stream: false,
              max_tokens: 600,
              temperature: 0.6,
            }),
          });
          if ((response.status === 429 || response.status >= 500) && attempt === 0) {
            await response.body?.cancel();
            await delay(400);
            continue;
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error('Provider unavailable');
          }
          const reader = response.body?.getReader();
          if (!reader) throw new Error('Missing body');
          const chunks: Uint8Array[] = [];
          let total = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              total += value.byteLength;
              if (total > 64000) throw new Error('Oversized response');
              chunks.push(value);
            }
          } finally {
            await reader.cancel();
          }
          const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          return responseSchema.parse(data).choices[0]!.message.content;
        } catch {
          throw new Error('Sol could not get a reply from the AI provider.');
        }
      }
      throw new Error('Sol could not get a reply from the AI provider.');
    },
  };
}
