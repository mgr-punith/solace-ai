import type { QueryClient } from '@tanstack/react-query';
import type { MoodCheckin, SendMessageInput } from '@solace/shared';
import { moods } from '../../theme/tokens';

export type ChatDraft = {
  text: string;
  origin: 'checkin' | 'breathing' | null;
  pending: SendMessageInput | null;
};
export const chatDraftKey = (userId: string | undefined, id: string) =>
  ['chat', userId, id, 'draft'] as const;

/** In-memory only. AuthProvider clears this cache on identity changes. */
export function seedChatDraft(client: QueryClient, userId: string, id: string, draft: ChatDraft) {
  const key = chatDraftKey(userId, id);
  const current = client.getQueryData<ChatDraft>(key);
  if (current?.text.trim() || current?.pending) return false;
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData(key, draft);
  return true;
}

export function checkinDraft(entry: MoodCheckin): ChatDraft {
  return {
    text: [
      `I checked in feeling ${moods[entry.mood - 1]?.label ?? 'Okay'}.`,
      entry.tags.length ? `Words that fit: ${entry.tags.join(', ')}.` : '',
      entry.note ? `My note: ${entry.note}` : '',
      'I’d like to talk about it.',
    ]
      .filter(Boolean)
      .join('\n'),
    origin: 'checkin',
    pending: null,
  };
}

export function reflectionDraft(durationSeconds: number, afterMood: number | null): ChatDraft {
  const mood = afterMood === null ? null : moods[afterMood - 1]?.label;
  return {
    text: `I took a ${durationSeconds / 60}-minute breathing break.${mood ? ` I feel ${mood} now.` : ''}`,
    origin: 'breathing',
    pending: null,
  };
}
