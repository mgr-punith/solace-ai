import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SendMessageInput } from '@solace/shared';
import { useAuth } from '../auth/context';
import { chatApi } from './api';

export const newChatRequestId = () =>
  `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export function useConversations() {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: ['chat', auth.session?.user.id, 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => auth.request((token) => chatApi.list(token, pageParam)),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: auth.status === 'signedIn',
    retry: false,
  });
}
export function useMessages(id: string) {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: ['chat', auth.session?.user.id, id],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => auth.request((token) => chatApi.messages(token, id, pageParam)),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: auth.status === 'signedIn',
    retry: false,
  });
}
export function useSendMessage(id: string) {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      auth.request((token) => chatApi.send(token, id, input)),
    retry: false,
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['chat', userId] });
    },
  });
}
export function useCreateConversation() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (requestId: string) => auth.request((token) => chatApi.create(token, requestId)),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['chat', userId] });
    },
  });
}
export function useDeleteConversation() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (id: string) => auth.request((token) => chatApi.remove(token, id)),
    retry: false,
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ['chat', userId, id] });
      void client.invalidateQueries({ queryKey: ['chat', userId, 'history'] });
    },
  });
}
