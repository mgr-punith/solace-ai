import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDay, type MoodInput } from '@solace/shared';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { moodApi } from './api';

export function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function useMoodToday() {
  const auth = useAuth();
  const { now, active } = useTheme();
  const timezone = deviceTimezone();
  const day = localDay(now, timezone);
  const query = useQuery({
    queryKey: ['mood', auth.session?.user.id, 'today', timezone, day],
    queryFn: () =>
      auth.request((token) => moodApi.list(token, { period: 'today', timezone, limit: 1 })),
    enabled: auth.status === 'signedIn',
    retry: false,
    staleTime: 30_000,
  });
  const { refetch } = query;
  useEffect(() => {
    if (active && auth.status === 'signedIn') void refetch();
  }, [active, auth.status, refetch]);
  return query;
}
export function useMoodHistory() {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: ['mood', auth.session?.user.id, 'history'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      auth.request((token) => moodApi.list(token, { cursor: pageParam, limit: 10 })),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: auth.status === 'signedIn',
    retry: false,
  });
}
export function useRecentMoods(limit = 3) {
  const auth = useAuth();
  return useQuery({
    queryKey: ['mood', auth.session?.user.id, 'recent', limit],
    queryFn: () => auth.request((token) => moodApi.list(token, { limit })),
    enabled: auth.status === 'signedIn',
    retry: false,
  });
}
export function useSaveMood() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (input: MoodInput) => auth.request((token) => moodApi.save(token, input)),
    onSuccess: (entry) => {
      // Home can immediately show the server-confirmed save without a duplicate local copy.
      client.setQueryData(
        [
          'mood',
          userId,
          'today',
          entry.timezone,
          localDay(new Date(entry.createdAt), entry.timezone),
        ],
        { items: [entry], nextCursor: null },
      );
      void client.invalidateQueries({ queryKey: ['mood', userId] });
      void client.invalidateQueries({ queryKey: ['progress', userId] });
      void client.invalidateQueries({ queryKey: ['daily-wellness', userId] });
    },
    retry: false,
  });
}
export function useDeleteMood() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (id: string) => auth.request((token) => moodApi.remove(token, id)),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['mood', userId] });
      void client.invalidateQueries({ queryKey: ['progress', userId] });
      void client.invalidateQueries({ queryKey: ['daily-wellness', userId] });
    },
    retry: false,
  });
}
