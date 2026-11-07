import type { Conversation } from '@solace/shared';

export function conversationTitle(conversation: Conversation) {
  if (conversation.title !== 'Conversation with Sol') return conversation.title;
  return (
    new Date(conversation.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }) + ' conversation'
  );
}

export function conversationTime(conversation: Conversation) {
  return new Date(conversation.updatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
