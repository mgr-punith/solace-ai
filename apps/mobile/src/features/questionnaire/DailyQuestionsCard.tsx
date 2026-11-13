import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Action, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { useDailyQuestions, useQuestionnaireDraft } from './hooks';

export function DailyQuestionsCard({ compact = false }: { compact?: boolean }) {
  const query = useDailyQuestions();
  const { draft } = useQuestionnaireDraft();
  const { sky } = useTheme();
  const today = query.data;
  return (
    <Surface>
      <View style={layoutStyles.row}>
        <Icon name={today?.completion ? 'complete' : 'questions'} />
        <View style={layoutStyles.grow}>
          <AppText variant="heading">{compact ? 'Your points' : 'Your daily four'}</AppText>
          {today && (
            <AppText variant="caption" tone="secondary">
              {today.totalPoints} points so far
            </AppText>
          )}
        </View>
        {!compact && today && !today.completion && (
          <AppText variant="caption">+{today.pointsAvailable} points</AppText>
        )}
      </View>
      {query.isPending && (
        <ActivityIndicator accessibilityLabel="Loading daily questions" color={sky.palette.text} />
      )}
      {query.isError && (
        <>
          <AppText variant="bodySmall" tone="error" accessibilityRole="alert">
            Your daily questions couldn’t be loaded.
          </AppText>
          <Action variant="quiet" onPress={() => void query.refetch()}>
            Reload daily questions
          </Action>
        </>
      )}
      {today && !compact && (
        <AppText variant="bodySmall" tone="secondary">
          {today.completion
            ? `${today.completion.points} points saved today.`
            : 'Four questions. About a minute. Every answer counts the same.'}
        </AppText>
      )}
      {(today || draft) && (
        <Action
          variant={compact || today?.completion ? 'quiet' : 'primary'}
          icon="arrow"
          onPress={() => router.push('/daily-questions')}
        >
          {today?.completion
            ? 'See today’s result'
            : draft?.pending
              ? 'Check your save'
              : draft && !draft.result
                ? 'Continue your four'
                : 'Answer today’s four'}
        </Action>
      )}
    </Surface>
  );
}
