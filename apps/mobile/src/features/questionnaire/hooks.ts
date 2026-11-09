import { useCallback, useEffect } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { localDay, questionnaireInputSchema, type QuestionnaireStatus } from '@solace/shared';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { deviceTimezone } from '../mood/hooks';
import { questionnaireApi } from './api';
import { questionnaireDraftKey, questionnaireKey, type QuestionnaireDraft } from './draft';
import { AuthApiError } from '../../lib/api';

export function useDailyQuestions() {
  const auth = useAuth();
  const { now, active } = useTheme();
  const timezone = deviceTimezone();
  const day = localDay(now, timezone);
  const query = useQuery({
    queryKey: questionnaireKey(auth.session?.user.id, timezone, day),
    queryFn: () => auth.request((token) => questionnaireApi.today(token, timezone)),
    enabled: auth.status === 'signedIn',
    retry: false,
    staleTime: 30_000,
  });
  const { refetch } = query;
  useEffect(() => {
    if (active && auth.status === 'signedIn') void refetch();
  }, [active, auth.status, refetch]);
  useFocusEffect(
    useCallback(() => {
      if (auth.status === 'signedIn') void refetch();
    }, [auth.status, refetch]),
  );
  return query;
}

/** Session-only answers. AuthProvider clears the query cache on identity changes. */
export function useQuestionnaireDraft() {
  const auth = useAuth();
  const client = useQueryClient();
  const key = questionnaireDraftKey(auth.session?.user.id);
  const query = useQuery<QuestionnaireDraft | null>({
    queryKey: key,
    queryFn: () => null,
    initialData: null,
    enabled: false,
    gcTime: Infinity,
  });
  const setDraft = useCallback(
    (value: QuestionnaireDraft | null) => {
      client.setQueryData(questionnaireDraftKey(auth.session?.user.id), value);
    },
    [client, auth.session?.user.id],
  );
  return {
    draft: query.data ?? null,
    setDraft,
  };
}

export function useSaveQuestionnaire() {
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.session?.user.id;
  const mutationKey = ['questionnaire', userId, 'save'] as const;
  const isSaving = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    mutationFn: async (draft: QuestionnaireDraft) => {
      const key = questionnaireDraftKey(userId);
      const owner = client.getQueryCache().find({ queryKey: key, exact: true });
      const stillOwned = () =>
        owner !== undefined &&
        client.getQueryCache().find({ queryKey: key, exact: true }) === owner;
      const input =
        draft.pending ??
        questionnaireInputSchema.parse({
          version: draft.version,
          timezone: draft.timezone,
          answers: draft.answers,
        });
      if (!stillOwned() || draft.result) return null;
      client.setQueryData<QuestionnaireDraft>(key, { ...draft, pending: input, failure: null });
      try {
        const result = await auth.request((token) =>
          questionnaireApi.save(token, draft.day, input),
        );
        if (!stillOwned()) return null;
        // Cancel earlier status reads so they cannot overwrite this confirmed completion.
        await client.cancelQueries({ queryKey: ['questionnaire', userId, 'today'] });
        if (!stillOwned()) return null;
        client.setQueryData<QuestionnaireDraft>(
          key,
          (current) =>
            current && {
              ...current,
              result,
              pending: null,
              failure: null,
            },
        );
        client.setQueriesData<QuestionnaireStatus>(
          { queryKey: ['questionnaire', userId, 'today'] },
          (current) =>
            current && {
              ...current,
              totalPoints: Math.max(current.totalPoints, result.totalPoints),
              completion:
                current.day === result.completion.day ? result.completion : current.completion,
            },
        );
        void client.invalidateQueries({ queryKey: ['questionnaire', userId, 'today'] });
        void client.invalidateQueries({ queryKey: ['progress', userId] });
        return result;
      } catch (error) {
        if (stillOwned()) {
          const invalid =
            error instanceof AuthApiError &&
            (error.code === 'VALIDATION_ERROR' || error.code === 'QUESTIONNAIRE_ANSWERS_INVALID');
          client.setQueryData<QuestionnaireDraft>(
            key,
            (current) =>
              current && {
                ...current,
                pending: invalid ? null : input,
                failure:
                  error instanceof AuthApiError && error.code === 'QUESTIONNAIRE_DAY_CHANGED'
                    ? 'day-changed'
                    : invalid
                      ? 'invalid'
                      : 'retry',
              },
          );
        }
        throw error;
      }
    },
  });
  return {
    isSaving,
    save: (draft: QuestionnaireDraft) => {
      if (client.isMutating({ mutationKey }) || draft.result) return Promise.resolve(null);
      return mutation.mutateAsync(draft);
    },
  };
}
