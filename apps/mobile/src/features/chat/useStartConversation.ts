import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '../auth/context';
import { newChatRequestId, useCreateConversation } from './hooks';
import { seedChatDraft, type ChatDraft } from './drafts';

/** Retain both intent and retry key when a creation response is lost. */
export function useStartConversation() {
  const auth = useAuth();
  const client = useQueryClient();
  const create = useCreateConversation();
  const busy = useRef(false);
  const intent = useRef<{ userId: string; requestId: string; draft: ChatDraft | undefined } | null>(
    null,
  );
  const currentUser = useRef(auth.session?.user.id);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  currentUser.current = auth.session?.user.id;
  async function start(draft?: ChatDraft) {
    const userId = auth.session?.user.id;
    if (busy.current || !userId) return;
    busy.current = true;
    if (intent.current?.userId !== userId)
      intent.current = { userId, requestId: newChatRequestId(), draft };
    const requested = intent.current;
    if (!requested) return;
    try {
      const conversation = await create.mutateAsync(requested.requestId);
      if (!mounted.current || currentUser.current !== userId) return;
      if (requested.draft) seedChatDraft(client, userId, conversation.id, requested.draft);
      intent.current = null;
      router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
    } catch {
      // Mutation exposes recovery; the intent remains available for an identical retry.
    } finally {
      busy.current = false;
    }
  }
  return { start, isPending: create.isPending, isError: create.isError, error: create.error };
}
