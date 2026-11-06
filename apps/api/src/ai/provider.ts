export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export interface LLMProvider {
  reply(messages: readonly LLMMessage[]): Promise<string>;
}
