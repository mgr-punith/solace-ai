import type { ChatActivity, ChatMessage } from '@solace/shared';
import type { LLMMessage } from '../provider.js';
import { solPrompt } from '../prompts/sol-v2.js';

export type SolContextMessage = LLMMessage & {
  activity?: ChatActivity | null | undefined;
  kind?: ChatMessage['kind'];
};

// Conservative UTF-8 byte budget: at most 12,000 bytes of conversation, plus the fixed prompt.
// This bounds byte-level tokenizer input without assuming English characters per token.
export function assembleContext(
  messages: readonly SolContextMessage[],
  { allowActivity = true }: { allowActivity?: boolean } = {},
): LLMMessage[] {
  const selected: LLMMessage[] = [];
  let bytes = 0;
  for (const message of [...messages].reverse()) {
    if (message.role === 'system') continue;
    // Plain-text assistant history encouraged Groq to continue in plain text,
    // even with a strict response schema. Reconstruct only the public reply fields.
    const content =
      message.role === 'assistant'
        ? JSON.stringify({
            content: message.content,
            activity: message.kind === 'crisis' ? null : (message.activity ?? null),
            needsSupport: message.kind === 'crisis',
          })
        : message.content;
    const size = Buffer.byteLength(content, 'utf8');
    if (bytes + size > 12_000 || selected.length >= 20) break;
    selected.unshift({ role: message.role, content });
    bytes += size;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  const content = allowActivity
    ? solPrompt
    : `${solPrompt}\nFor this reply, activity must be null. Do not offer another practice. Answer direct questions about the existing app controls, including breathing customization; otherwise stay with the conversation.`;
  return [{ role: 'system', content }, ...selected];
}
