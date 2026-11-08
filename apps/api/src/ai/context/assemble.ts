import type { LLMMessage } from '../provider.js';
import { solPrompt } from '../prompts/sol-v2.js';

// Conservative UTF-8 byte budget: at most 12,000 bytes of conversation, plus the fixed prompt.
// This bounds byte-level tokenizer input without assuming English characters per token.
export function assembleContext(
  messages: readonly LLMMessage[],
  { allowActivity = true }: { allowActivity?: boolean } = {},
): LLMMessage[] {
  const selected: LLMMessage[] = [];
  let bytes = 0;
  for (const message of [...messages].reverse()) {
    if (message.role === 'system') continue;
    const size = Buffer.byteLength(message.content, 'utf8');
    if (bytes + size > 12_000 || selected.length >= 20) break;
    selected.unshift({ role: message.role, content: message.content });
    bytes += size;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  const content = allowActivity
    ? solPrompt
    : `${solPrompt}\nFor this reply, activity must be null. Stay with the conversation; do not offer another practice.`;
  return [{ role: 'system', content }, ...selected];
}
