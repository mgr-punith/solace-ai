import { z } from 'zod';
import type { LLMProvider } from '../provider.js';
import { parseReply, solReplyFormat } from '../reply.js';
const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.literal('stop').optional(),
        message: z.object({ content: z.string().trim().min(1).max(8000) }),
      }),
    )
    .min(1),
});
const groqFormatErrorSchema = z.object({
  error: z.object({ code: z.literal('json_validate_failed') }),
});
export function createOpenAICompatibleProvider(
  config: {
    baseUrl: string;
    apiKey: string;
    model: string;
    groqReasoning?: boolean;
  },
  fetcher: typeof fetch = fetch,
): LLMProvider {
  const base = new URL(config.baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    throw new Error('LLM_BASE_URL must be a plain HTTPS URL.');
  return {
    async reply(messages) {
      // One deadline covers both attempts, retry delay and response body. Leave
      // time to persist the reply before the mobile timeout and 60-second lease.
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 45_000);
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          controller.signal.throwIfAborted();
          const response = await fetcher(`${base.toString().replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            redirect: 'error',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages,
              stream: false,
              ...(config.groqReasoning
                ? {
                    max_completion_tokens: 1024,
                    reasoning_effort: 'low',
                    include_reasoning: false,
                    response_format: solReplyFormat,
                  }
                : { max_tokens: 600 }),
              temperature: 0.6,
            }),
          });
          if (config.groqReasoning && response.status === 400 && attempt === 0) {
            // Groq can reject a generation even in strict mode. Retry only this
            // specific code; never use or log its unvalidated failed_generation.
            const error = groqFormatErrorSchema.safeParse(await readBoundedJson(response));
            if (!error.success) throw new Error('Provider unavailable');
            await waitForRetry(controller.signal, 400);
            continue;
          }
          if ((response.status === 429 || response.status >= 500) && attempt === 0) {
            await response.body?.cancel();
            const seconds = Number(response.headers.get('retry-after'));
            const retryMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 400;
            // Do not hammer a free-tier quota that cannot recover within our deadline.
            if (retryMs >= 45_000) throw new Error('Provider rate limit');
            await waitForRetry(controller.signal, retryMs);
            continue;
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error('Provider unavailable');
          }
          const data = await readBoundedJson(response);
          const choice = responseSchema.parse(data).choices[0]!;
          if (config.groqReasoning && choice.finish_reason !== 'stop')
            throw new Error('Incomplete reply');
          return parseReply(choice.message.content);
        }
        throw new Error('Provider unavailable');
      } catch {
        throw new Error('Sol could not get a reply from the AI provider.');
      } finally {
        clearTimeout(deadline);
      }
    },
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
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
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function waitForRetry(signal: AbortSignal, milliseconds: number) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new Error('Provider deadline exceeded'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}
