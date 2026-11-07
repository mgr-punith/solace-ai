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

export function HomeScreen() {
  const { fontScale } = useWindowDimensions();
  const auth = useAuth();
  const { now, sky } = useTheme();
  const today = useMoodToday();
  const [selected, setSelected] = useState(2);
  const [saved, setSaved] = useState<MoodCheckin | null>(null);
  const [form, setForm] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
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
          onRefresh={() => void today.refetch()}
          tintColor={sky.palette.text}
        />
      }
    >
      <View style={layoutStyles.row}>
        <View style={layoutStyles.grow}>
          <AppText variant="heading">solace</AppText>
          <AppText variant="caption" tone="secondary">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </AppText>
        </View>
        <IconButton icon="bell" label="Open reminders" onPress={() => router.push('/reminders')} />
      </View>
      <View style={[styles.hero, fontScale > 1.2 && styles.stacked]}>
        <View style={styles.greeting}>
          <AppText variant="bodySmall" tone="secondary">
            {greeting},
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {name}
          </AppText>
          <AppText variant="bodySmall" accessibilityLiveRegion="polite">
            {response ?? 'Tap Sol to say hello.'}
          </AppText>
          <AppText variant="caption" tone="secondary">
            Hold Sol for a quiet breath
          </AppText>
        </View>
        <Companion
          mood={saved ? saved.mood - 1 : selected}
          size={tokens.sol.home}
          onResponse={setResponse}
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
      <View>
        <NavigationRow
          icon="wind"
          title="Take a breathing break"
          subtitle="One minute, at your pace"
          onPress={() => router.push('/breathing')}
        />
        <NavigationRow
          icon="talk"
          title="Talk with Sol"
          subtitle="Pick up a conversation, or start fresh"
          onPress={() => router.navigate('/talk')}
        />
      </View>
      <View style={[styles.quote, { borderColor: sky.palette.secondary }]}>
        <AppText variant="caption" tone="secondary">
          Today’s words
        </AppText>
        <AppText variant="title">{affirmation.text}</AppText>
        <NavigationRow
          icon="heart"
          title="Open affirmations"
          onPress={() => router.push('/affirmations')}
        />
      </View>
      <View style={layoutStyles.gap}>
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
            <AppText>
              {moods[latest.mood - 1]?.label} ·{' '}
              {new Date(latest.createdAt).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </AppText>
            {latest.tags.length > 0 && (
              <AppText variant="bodySmall" tone="secondary">
                {latest.tags.join(', ')}
              </AppText>
            )}
            {latest.note ? <AppText>{latest.note}</AppText> : null}
          </>
        ) : (
          <AppText tone="secondary">No check-in yet today. Start wherever you are.</AppText>
        )}
        <NavigationRow
          icon="progress"
          title="View your check-ins and progress"
          onPress={() => router.navigate('/progress')}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  greeting: { flex: 1, gap: tokens.spacing.xs },
  quote: { borderTopWidth: tokens.border, paddingTop: tokens.spacing.ml, gap: tokens.spacing.sm },
});
