import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/context';
import { chatDraftKey, type ChatDraft } from './drafts';

const emptyDraft: ChatDraft = { text: '', origin: null, pending: null };
export function useChatDraft(id: string) {
  const { session } = useAuth();
  const client = useQueryClient();
  const userId = session?.user.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Draft edits must reach the composer synchronously, including a Send immediately after typing.
  const subscribe = useCallback(
    (listener: () => void) => client.getQueryCache().subscribe(listener),
    [client],
  );
  const snapshot = useCallback(
    () => client.getQueryData<ChatDraft>(chatDraftKey(userId, id)) ?? emptyDraft,
    [client, userId, id],
  );
  const draft = useSyncExternalStore(subscribe, snapshot, snapshot);
  const update = useCallback(
    (changes: Partial<ChatDraft>) => {
      if (!mounted.current || userId !== currentUser.current) return;
      const key = chatDraftKey(userId, id);
      client.setQueryDefaults(key, { gcTime: Infinity });
      client.setQueryData<ChatDraft>(key, (current) => ({
        ...(current ?? emptyDraft),
        ...changes,
      }));
    },
    [client, id, userId],
  );
  return {
    draft,
    update,
  };
}
