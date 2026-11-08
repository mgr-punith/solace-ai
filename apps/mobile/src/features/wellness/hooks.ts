import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDay, type ActivityInput, type DailyWellness } from '@solace/shared';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { deviceTimezone } from '../mood/hooks';
import { wellnessApi } from './api';
export const activityRequestId = () =>
  `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const dailyWellnessKey = (userId: string | undefined, timezone: string, day: string) =>
  ['daily-wellness', userId, timezone, day] as const;
export function useDailyWellness() {
  const auth = useAuth();
  const { now, active } = useTheme();
  const timezone = deviceTimezone();
  const day = localDay(now, timezone);
  const query = useQuery({
    queryKey: dailyWellnessKey(auth.session?.user.id, timezone, day),
    queryFn: async () => {
      const result = await auth.request((token) => wellnessApi.daily(token, timezone));
      // Don't label a different server day as this day's completion (clock skew/midnight).
      if (result.day !== day || result.timezone !== timezone)
        throw new Error('Daily status changed. Refresh to try again.');
      return result;
    },
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
export function useProgress() {
  const auth = useAuth();
  const { now, active } = useTheme();
  const timezone = deviceTimezone();
  const query = useQuery({
    queryKey: ['progress', auth.session?.user.id, timezone, localDay(now, timezone)],
    queryFn: () => auth.request((token) => wellnessApi.progress(token, timezone)),
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
export function useSaveActivity() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: (input: ActivityInput) => auth.request((token) => wellnessApi.save(token, input)),
    retry: false,
    onSuccess: (activity, input) => {
      if (input.type === 'affirmation') {
        const day = localDay(new Date(activity.completedAt), input.timezone);
        client.setQueryData<DailyWellness>(
          dailyWellnessKey(userId, input.timezone, day),
          (previous) =>
            previous && {
              ...previous,
              readAffirmationIds: [
                ...new Set([...previous.readAffirmationIds, input.affirmationId]),
              ],
            },
        );
      }
      void client.invalidateQueries({ queryKey: ['progress', userId] });
      void client.invalidateQueries({ queryKey: ['daily-wellness', userId] });
    },
  });
}
export function useFavorites() {
  const auth = useAuth();
  return useQuery({
    queryKey: ['favorites', auth.session?.user.id],
    queryFn: () => auth.request((token) => wellnessApi.favorites(token)),
    enabled: auth.status === 'signedIn',
    retry: false,
  });
}
export function useFavorite() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      auth.request((token) => wellnessApi.favorite(token, id, saved)),
    retry: false,
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorites', userId] }),
  });
}
