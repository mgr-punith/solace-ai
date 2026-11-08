import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { dailyRecommendations, type DailyRecommendation, type MoodCheckin } from '@solace/shared';
import { Action, AppText } from '../../components/ui/primitives';
import { Icon, type IconName } from '../../components/ui/Icon';
import { layoutStyles } from '../../components/ui/layout';
import { useStartConversation } from '../chat/useStartConversation';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { useDailyWellness } from './hooks';
import { DailyMoments } from './DailyMoments';

const icons: Record<DailyRecommendation['id'], IconName> = {
  breathing: 'wind',
  affirmation: 'book',
  reflection: 'talk',
};

export function DailyWellnessCard({
  mood,
  moodUnavailable = false,
}: {
  mood: MoodCheckin | null;
  moodUnavailable?: boolean;
}) {
  const daily = useDailyWellness();
  const chat = useStartConversation();
  const { sky } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showAfterCompletion, setShowAfterCompletion] = useState(false);
  if (daily.isPending)
    return (
      <View style={layoutStyles.row}>
        <ActivityIndicator
          accessibilityLabel="Loading daily suggestions"
          color={sky.palette.text}
        />
        <AppText variant="bodySmall" tone="secondary">
          Opening your daily suggestions…
        </AppText>
      </View>
    );
  if (!daily.data)
    return (
      <View style={layoutStyles.gap}>
        <AppText variant="heading">Today’s suggestions</AppText>
        <AppText accessibilityRole="alert" tone="error">
          Your suggestions couldn’t load. You can still open a practice from Wellness.
        </AppText>
        <Action
          secondary
          onPress={() => {
            void daily.refetch();
          }}
        >
          Reload suggestions
        </Action>
        <Action variant="quiet" onPress={() => router.navigate('/wellness')}>
          Open Wellness
        </Action>
      </View>
    );
  const options = dailyRecommendations(moodUnavailable ? null : mood, daily.data);
  const main = options[0]!;
  const complete =
    daily.data.checkedIn &&
    (daily.data.breathingSessions > 0 || daily.data.readAffirmationIds.length > 0);
  function open(option: DailyRecommendation) {
    if (option.id === 'breathing') router.push('/breathing');
    else if (option.id === 'affirmation') router.push('/affirmations');
    else void chat.start({ text: option.draft!, origin: null, pending: null });
  }
  function choice(option: DailyRecommendation, primary: boolean) {
    return (
      <View
        key={option.id}
        style={[
          styles.choice,
          !primary && { borderTopWidth: tokens.border, borderColor: sky.palette.secondary },
        ]}
      >
        <View style={layoutStyles.row}>
          <Icon name={icons[option.id]} />
          <AppText variant={primary ? 'heading' : 'body'} style={layoutStyles.grow}>
            {option.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {option.minutes} min
          </AppText>
        </View>
        <AppText variant="bodySmall" tone="secondary">
          {option.reason}
        </AppText>
        {primary && <AppText variant="bodySmall">{option.description}</AppText>}
        {option.completed && (
          <AppText variant="caption" tone="secondary">
            Saved today · revisit anytime
          </AppText>
        )}
        <Action
          icon={icons[option.id]}
          secondary={!primary}
          disabled={option.id === 'reflection' && chat.isPending}
          onPress={() => open(option)}
        >
          {option.id === 'reflection' && chat.isPending
            ? 'Opening conversation…'
            : option.id === 'reflection' && chat.isError
              ? 'Retry opening reflection'
              : option.action}
        </Action>
        {option.id === 'reflection' && chat.isError && (
          <AppText accessibilityRole="alert" tone="error">
            The conversation couldn’t open. Your prompt is kept for a retry.
          </AppText>
        )}
        {option.id === 'reflection' && (
          <AppText variant="caption" tone="secondary">
            You can edit the prompt before sending it to Sol.
          </AppText>
        )}
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <DailyMoments daily={daily.data} />
      {complete && !showAfterCompletion ? (
        <Action variant="quiet" onPress={() => setShowAfterCompletion(true)}>
          More ideas for today
        </Action>
      ) : (
        <View style={[styles.recommendation, { backgroundColor: sky.surface }]}>
          <AppText variant="caption" tone="secondary">
            {moodUnavailable
              ? 'A general suggestion · check-in unavailable'
              : mood
                ? 'Today’s suggestion · from your check-in'
                : 'Today’s suggestion'}
          </AppText>
          {choice(main, true)}
          <Action variant="quiet" onPress={() => setExpanded(!expanded)}>
            {expanded ? 'Fewer ideas' : 'Other ideas'}
          </Action>
          {expanded && options.slice(1).map((option) => choice(option, false))}
        </View>
      )}
      {daily.isError && (
        <>
          <AppText accessibilityRole="alert" tone="error">
            Showing your last saved daily status. Reconnect to refresh it.
          </AppText>
          <Action
            variant="quiet"
            onPress={() => {
              void daily.refetch();
            }}
          >
            Refresh daily status
          </Action>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: tokens.spacing.md },
  recommendation: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.surface,
    gap: tokens.spacing.xs,
  },
  choice: { gap: tokens.spacing.sm, paddingTop: tokens.spacing.smd },
});
