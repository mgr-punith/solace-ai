import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { affirmationForDay, localDay, type MoodCheckin } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { AppText, Action, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { IconButton, NavigationRow, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { deviceTimezone, useMoodToday } from '../mood/hooks';
import { MoodForm } from '../mood/MoodForm';
import { ProgressSummary } from '../progress/ProgressSummary';
import { useProgress } from '../wellness/hooks';
export function HomeScreen() {
  const { fontScale } = useWindowDimensions();
  const auth = useAuth();
  const { now, sky } = useTheme();
  const today = useMoodToday();
  const progress = useProgress();
  const [selected, setSelected] = useState(2);
  const [saved, setSaved] = useState<MoodCheckin | null>(null);
  const [form, setForm] = useState(0);
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const name = auth.session?.user.name.trim().split(/\s+/)[0] ?? 'there';
  const latest = today.data?.items[0];
  const affirmation = affirmationForDay(localDay(now, deviceTimezone()));
  return (
    <Screen
      inTabs
      keyboard
      refreshControl={
        <RefreshControl
          refreshing={today.isRefetching}
          onRefresh={() => {
            void today.refetch();
            void progress.refetch();
          }}
          tintColor={sky.palette.text}
        />
      }
    >
      <View style={[styles.top, { backgroundColor: sky.surface }]}>
        <View style={layoutStyles.grow}>
          <AppText variant="heading">solace</AppText>
          <AppText variant="caption" tone="secondary">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </AppText>
        </View>
        <IconButton icon="bell" label="Open reminders" onPress={() => router.push('/reminders')} />
        <IconButton icon="user" label="Your space" onPress={() => router.navigate('/you')} />
      </View>
      <View
        style={[
          styles.hero,
          { backgroundColor: sky.surface, flexDirection: fontScale > 1.1 ? 'column' : 'row' },
        ]}
      >
        <View style={styles.greeting}>
          <AppText variant="bodySmall" tone="secondary">
            {greeting},
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {name}.
          </AppText>
          <AppText tone="secondary">Take a breath. You’re here.</AppText>
        </View>
        <Companion
          mood={saved ? saved.mood - 1 : selected}
          size={tokens.sol.onboarding}
          state="greeting"
        />
      </View>
      <Surface>
        {saved ? (
          <>
            <View style={layoutStyles.row}>
              <Icon name="complete" />
              <AppText accessibilityLiveRegion="polite" variant="heading">
                Your check-in is saved.
              </AppText>
            </View>
            <AppText>{moods[saved.mood - 1]?.response}</AppText>
            <Action
              secondary
              onPress={() => {
                setSaved(null);
                setForm((value) => value + 1);
              }}
            >
              Check in again
            </Action>
          </>
        ) : (
          <MoodForm key={form} onMood={setSelected} onSaved={setSaved} />
        )}
      </Surface>
      <Surface>
        <View style={layoutStyles.row}>
          <View style={layoutStyles.grow}>
            <AppText variant="caption" tone="secondary">
              A pause in your day
            </AppText>
            <AppText variant="title">Room to breathe.</AppText>
            <AppText variant="bodySmall" tone="secondary">
              A gentle rhythm, with Sol.
            </AppText>
          </View>
          <Icon name="wind" size={tokens.icon.lg} />
        </View>
        <Action icon="play" onPress={() => router.push('/breathing')}>
          Take a breathing break
        </Action>
      </Surface>
      <Surface style={styles.quote}>
        <Icon name="sparkles" />
        <AppText variant="caption" tone="secondary">
          Today’s words
        </AppText>
        <AppText variant="title">{affirmation.text}</AppText>
        <NavigationRow
          icon="heart"
          title="Keep what resonates"
          onPress={() => router.push('/affirmations')}
        />
      </Surface>
      <Surface>
        <ProgressSummary compact />
        <NavigationRow
          icon="progress"
          title="See your moments"
          onPress={() => router.navigate('/progress')}
        />
      </Surface>
      <Surface>
        <AppText variant="heading">Your latest check-in today</AppText>
        {today.isPending ? (
          <ActivityIndicator
            accessibilityLabel="Loading today's check-in"
            color={sky.palette.text}
          />
        ) : today.isError ? (
          <>
            <AppText tone="error" accessibilityRole="alert">
              Today’s check-in couldn’t be loaded. Your saved entries are safe.
            </AppText>
            <Action secondary onPress={() => void today.refetch()}>
              Try loading again
            </Action>
          </>
        ) : latest ? (
          <>
            <AppText variant="title">{moods[latest.mood - 1]?.label}</AppText>
            <AppText tone="secondary" variant="bodySmall">
              {new Date(latest.createdAt).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
              {latest.tags.length ? ` · ${latest.tags.join(', ')}` : ''}
            </AppText>
            {latest.note ? <AppText>{latest.note}</AppText> : null}
          </>
        ) : (
          <AppText tone="secondary">No check-in yet today. Start wherever you are.</AppText>
        )}
        <NavigationRow
          icon="book"
          title="View your check-ins"
          onPress={() => router.navigate('/progress')}
        />
      </Surface>
    </Screen>
  );
}
const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.tag,
  },
  hero: { alignItems: 'center', borderRadius: tokens.radius.surface, padding: tokens.spacing.smd },
  greeting: { flex: 1, gap: tokens.spacing.sm },
  quote: { paddingVertical: tokens.spacing.lg },
});
