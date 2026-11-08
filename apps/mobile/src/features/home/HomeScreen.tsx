import { useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { affirmationForDay, localDay } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { AppText, Action, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { MoodFace } from '../../components/ui/MoodFace';
import { IconButton, NavigationRow, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useAuth } from '../auth/context';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { deviceTimezone, useMoodToday } from '../mood/hooks';
import { MoodForm } from '../mood/MoodForm';
import { checkinDraft } from '../chat/drafts';
import { useStartConversation } from '../chat/useStartConversation';
import { firstName, homeGreeting } from './greeting';

export function HomeScreen() {
  const auth = useAuth();
  const { now } = useTheme();
  const day = localDay(now, deviceTimezone());
  return (
    <DailyHome key={`${auth.session?.user.id}:${day}`} name={firstName(auth.session?.user.name)} />
  );
}

function DailyHome({ name }: { name: string }) {
  const { now, sky } = useTheme();
  const today = useMoodToday();
  const chat = useStartConversation();
  const [selected, setSelected] = useState(2);
  const [editing, setEditing] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const latest = today.data?.items[0];
  const showingSaved = !!latest && !editing;
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
      <View style={styles.hero}>
        <View style={styles.greeting}>
          <AppText variant="bodySmall" tone="secondary">
            {homeGreeting(now.getHours())},
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {name}
          </AppText>
          <AppText variant="bodySmall" accessibilityLiveRegion="polite">
            {response ?? (showingSaved ? 'Want to talk about it?' : 'How are you today?')}
          </AppText>
        </View>
        <Companion
          mood={showingSaved ? latest.mood - 1 : selected}
          size={tokens.sol.home}
          onResponse={setResponse}
        />
      </View>
      <Surface>
        {today.isPending ? (
          <View style={layoutStyles.row}>
            <ActivityIndicator
              accessibilityLabel="Loading today's check-in"
              color={sky.palette.text}
            />
            <AppText tone="secondary">Opening today’s check-in…</AppText>
          </View>
        ) : today.isError && !today.data ? (
          <>
            <AppText tone="error" accessibilityRole="alert">
              Today’s check-in couldn’t be loaded. Try again to see where you left off.
            </AppText>
            <Action secondary onPress={() => void today.refetch()}>
              Try loading again
            </Action>
          </>
        ) : showingSaved ? (
          <>
            <View style={layoutStyles.row}>
              <MoodFace mood={latest.mood - 1} />
              <View style={layoutStyles.grow}>
                <AppText variant="caption" tone="secondary">
                  Today ·{' '}
                  {new Date(latest.createdAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </AppText>
                <AppText variant="heading" accessibilityLiveRegion="polite">
                  Feeling {moods[latest.mood - 1]?.label.toLowerCase()}
                </AppText>
              </View>
              <Icon name="check" size={tokens.icon.sm} />
            </View>
            {latest.tags.length > 0 && (
              <AppText variant="bodySmall" tone="secondary">
                {latest.tags.join(' · ')}
              </AppText>
            )}
            {latest.note ? <AppText numberOfLines={3}>{latest.note}</AppText> : null}
            <Action
              icon="talk"
              disabled={chat.isPending}
              onPress={() => void chat.start(checkinDraft(latest))}
            >
              {chat.isPending
                ? 'Opening conversation…'
                : chat.isError
                  ? 'Retry opening chat'
                  : 'Talk about this'}
            </Action>
            <AppText variant="caption" tone="secondary">
              You can edit the message before you send it.
            </AppText>
            {chat.isError && (
              <AppText accessibilityRole="alert" tone="error">
                The conversation couldn’t open. Your check-in is saved; try again.
              </AppText>
            )}
            <Action
              variant="quiet"
              disabled={chat.isPending || chat.isError}
              onPress={() => setEditing(true)}
            >
              Check in again
            </Action>
          </>
        ) : (
          <>
            <MoodForm
              onMood={setSelected}
              onSaved={() => setEditing(false)}
              onCancel={latest ? () => setEditing(false) : undefined}
            />
          </>
        )}
        {today.isError && today.data && (
          <>
            <AppText tone="error" accessibilityRole="alert">
              Today’s check-in couldn’t refresh.
            </AppText>
            <Action variant="quiet" onPress={() => void today.refetch()}>
              Try loading again
            </Action>
          </>
        )}
      </Surface>
      <View>
        <NavigationRow
          icon="wind"
          title="Breathe for a minute"
          subtitle="Follow Sol as you breathe in and out"
          onPress={() => router.push('/breathing')}
        />
        {!showingSaved && (
          <NavigationRow
            icon="talk"
            title="Talk with Sol"
            subtitle="Tell Sol what’s on your mind"
            onPress={() => router.navigate('/talk')}
          />
        )}
      </View>
      <View style={[styles.quote, { borderColor: sky.palette.secondary }]}>
        <AppText variant="caption" tone="secondary">
          Today’s words
        </AppText>
        <AppText variant="heading">{affirmation.text}</AppText>
        <NavigationRow
          icon="heart"
          title="Open affirmations"
          onPress={() => router.push('/affirmations')}
        />
      </View>
      <NavigationRow
        icon="progress"
        title="Your check-ins and progress"
        onPress={() => router.navigate('/progress')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  greeting: { flex: 1, gap: tokens.spacing.xs },
  quote: { borderTopWidth: tokens.border, paddingTop: tokens.spacing.md, gap: tokens.spacing.sm },
});
