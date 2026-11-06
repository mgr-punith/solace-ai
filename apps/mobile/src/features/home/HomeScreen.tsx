import { useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import type { MoodCheckin } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { AppText, Action, Surface } from '../../components/ui/primitives';
import { Companion } from '../../components/sol/Companion';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { useMoodToday } from '../mood/hooks';
import { MoodForm } from '../mood/MoodForm';

export function HomeScreen() {
  const auth = useAuth();
  const { now, sky } = useTheme();
  const today = useMoodToday();
  const [selected, setSelected] = useState(2);
  const [saved, setSaved] = useState<MoodCheckin | null>(null);
  const [form, setForm] = useState(0);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = auth.session?.user.name.trim().split(/\s+/)[0] ?? 'there';
  const latest = today.data?.items[0];
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
      <AppText variant="caption" tone="secondary">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </AppText>
      <Companion mood={saved ? saved.mood - 1 : selected} size={tokens.sol.onboarding} />
      <Surface>
        <AppText variant="display" accessibilityRole="header">
          {greeting}, {name}.
        </AppText>
        <AppText tone="secondary">A little space to notice how you feel.</AppText>
        {saved ? (
          <>
            <AppText accessibilityLiveRegion="polite" variant="heading">
              Your check-in is saved.
            </AppText>
            <AppText>{moods[saved.mood - 1]?.response}</AppText>
            <Action
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
        <AppText variant="heading" accessibilityRole="header">
          Your latest check-in today
        </AppText>
        {today.isPending ? (
          <>
            <ActivityIndicator
              accessibilityLabel="Loading today's check-in"
              color={sky.palette.text}
            />
            <AppText tone="secondary">Opening today’s check-in…</AppText>
          </>
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
        <Action secondary onPress={() => router.push('/progress')}>
          View your check-ins
        </Action>
      </Surface>
    </Screen>
  );
}
