import type { ChatActivity, ChatMessage } from '@solace/shared';
import { assembleContext } from './context/assemble.js';
import type { LLMMessage, LLMProvider } from './provider.js';
import { llmReplySchema } from './reply.js';
import { crisisReply, isCrisis, unavailableReply } from './safety/crisis.js';

export type SolContextMessage = LLMMessage & {
  activity?: ChatActivity | null | undefined;
  kind?: ChatMessage['kind'];
};
export type SolReply = {
  content: string;
  kind: ChatMessage['kind'];
  activity: ChatActivity | null;
};

export async function generateSolReply({
  provider,
  message,
  context,
}: {
  provider: LLMProvider;
  message: string;
  context: () => Promise<readonly SolContextMessage[]>;
}): Promise<SolReply> {
  const support: SolReply = { content: crisisReply, kind: 'crisis', activity: null };
  if (isCrisis(message)) return support;
  try {
    const messages = await context();
    const previous = messages.findLast((item) => item.role === 'assistant');
    const allowActivity = !previous?.activity && previous?.kind !== 'crisis';
    const reply = llmReplySchema.parse(
      await provider.reply(assembleContext(messages, { allowActivity })),
    );
    if (reply.needsSupport) return support;
    return {
      content: reply.content,
      kind: 'normal',
      activity: allowActivity ? reply.activity : null,
    };
  } catch {
    return { content: unavailableReply, kind: 'fallback', activity: null };
  }
}
