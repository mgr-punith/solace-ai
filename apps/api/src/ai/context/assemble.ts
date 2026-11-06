import type { LLMMessage } from '../provider.js';
import { solPrompt } from '../prompts/sol-v1.js';

// Conservative UTF-8 byte budget: at most 12,000 bytes of conversation, plus the fixed prompt.
// This bounds byte-level tokenizer input without assuming English characters per token.
export function assembleContext(messages: readonly LLMMessage[]): LLMMessage[] {
  const selected: LLMMessage[] = [];
  let bytes = 0;
  for (const message of [...messages].reverse()) {
    if (message.role === 'system') continue;
    const size = Buffer.byteLength(message.content, 'utf8');
    if (bytes + size > 12_000 || selected.length >= 20) break;
    selected.unshift(message);
    bytes += size;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  return [{ role: 'system', content: solPrompt }, ...selected];
}
