import { useScreenBack } from '../../lib/useScreenBack';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  affirmationForDay,
  conversationSchema,
  localDay,
  type ActivityInput,
} from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { PageHeader, layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { useAuth } from '../auth/context';
import { deviceTimezone } from '../mood/hooks';
import { useDailyWellness, useFavorite, useFavorites, useSaveActivity } from './hooks';
export function AffirmationsScreen() {
  const auth = useAuth();
  return <AccountAffirmations key={auth.session?.user.id} />;
}
function AccountAffirmations() {
  const { saved, conversation } = useLocalSearchParams<{ saved?: string; conversation?: string }>();
  const parsedConversation = conversationSchema.shape.id.safeParse(conversation);
  const conversationId = parsedConversation.success ? parsedConversation.data : null;
  const goBack = useScreenBack(conversationId ? `/chat/${conversationId}` : '/wellness');
  const [showSaved, setShowSaved] = useState(saved === '1');
  const { now, sky } = useTheme();
  const timezone = deviceTimezone();
  const day = localDay(now, timezone);
  const [confirmed, setConfirmed] = useState<{ completedAt: string; id: string } | null>(null);
  const [retry, setRetry] = useState<{ day: string; input: ActivityInput } | null>(null);
  const saving = useRef(false);
  const reading = useSaveActivity();
  const daily = useDailyWellness();
  const favorites = useFavorites();
  const favorite = useFavorite();
  const displayedDay = retry?.day ?? day;
  const today = affirmationForDay(displayedDay);
  const isFavorite = favorites.data?.items.some((item) => item.id === today.id) ?? false;
  const readToday =
    displayedDay === day &&
    (daily.data?.readAffirmationIds.includes(today.id) ||
      (confirmed &&
        localDay(new Date(confirmed.completedAt), timezone) === day &&
        confirmed.id === today.id));
  const statusKnown = !!daily.data;
  useEffect(() => {
    // A refreshed server record can resolve a lost response without another write.
    if (
      retry?.day === day &&
      daily.data?.readAffirmationIds.includes(affirmationForDay(retry.day).id)
    )
      setRetry(null);
  }, [daily.data, day, retry]);
  async function markRead() {
    if (saving.current || readToday || (!statusKnown && !retry)) return;
    saving.current = true;
    const pending = retry ?? {
      day,
      input: {
        // Account-scoped by the API. The same day/words reuse this key across reopen/devices.
        requestId: `affirmation-${day}-${today.id}-${deviceTimezone().replaceAll('/', '-').replaceAll('_', '-').replaceAll('+', 'plus')}`,
        timezone: deviceTimezone(),
        type: 'affirmation' as const,
        affirmationId: today.id,
      },
    };
    setRetry(pending);
    try {
      const saved = await reading.mutateAsync(pending.input);
      setConfirmed({ completedAt: saved.completedAt, id: today.id });
      setRetry(null);
    } catch {
      /* Keep retry key and show recovery. */
    } finally {
      saving.current = false;
    }
  }
  return (
    <Screen>
      <PageHeader
        title="Words to keep"
        subtitle="Read today’s affirmation and save it if you like."
        back={goBack}
      />
      {conversationId && (
        <Action
          variant="quiet"
          icon="talk"
          onPress={() =>
            router.navigate({ pathname: '/chat/[id]', params: { id: conversationId } })
          }
        >
          Back to conversation
        </Action>
      )}
      <View style={layoutStyles.wrap}>
        <Action secondary selected={!showSaved} onPress={() => setShowSaved(false)}>
          Today
        </Action>
        <Action icon="heart" secondary selected={showSaved} onPress={() => setShowSaved(true)}>
          Saved words
        </Action>
      </View>
      {!showSaved && (
        <Surface style={{ paddingVertical: tokens.spacing.xl }}>
          <Icon name="sparkles" size={tokens.icon.lg} />
          <AppText variant="caption" tone="secondary">
            {displayedDay === day ? 'A thought for today' : 'Your earlier words, ready to save'}
          </AppText>
          <AppText variant="display">{today.text}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Try reading it to yourself.
          </AppText>
          {readToday ? (
            <View accessibilityLiveRegion="polite" style={layoutStyles.row}>
              <Icon name="complete" />
              <View style={layoutStyles.grow}>
                <AppText variant="heading">Read today</AppText>
                <AppText variant="caption" tone="secondary">
                  Saved in your progress
                </AppText>
              </View>
            </View>
          ) : statusKnown || retry ? (
            <Action icon="check" disabled={reading.isPending} onPress={() => void markRead()}>
              {reading.isPending
                ? 'Saving your read…'
                : reading.isError
                  ? 'Retry saving read'
                  : 'I’ve read this'}
            </Action>
          ) : null}
          {daily.isPending && !retry && (
            <ActivityIndicator
              accessibilityLabel="Checking today’s read status"
              color={sky.palette.text}
            />
          )}
          {daily.isError && !readToday && (
            <>
              <AppText accessibilityRole="alert" tone="error">
                Your read status couldn’t be loaded. You can still read and save favorites.
              </AppText>
              <Action
                variant="quiet"
                onPress={() => {
                  void daily.refetch();
                }}
              >
                Reload read status
              </Action>
            </>
          )}
          {reading.isError && !readToday && (
            <AppText accessibilityRole="alert" tone="error">
              This couldn’t be added to your progress. Try again when you’re connected.
            </AppText>
          )}
          <Action
            icon="heart"
            secondary
            disabled={!favorites.data || favorites.isError || favorite.isPending}
            onPress={() => favorite.mutate({ id: today.id, saved: !isFavorite })}
          >
            {isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          </Action>
        </Surface>
      )}
      {favorites.isPending && (
        <ActivityIndicator accessibilityLabel="Opening your saved words" color={sky.palette.text} />
      )}
      {(favorites.isError || favorite.isError) && (
        <Surface>
          <AppText accessibilityRole="alert" tone="error">
            Your saved words couldn’t be updated. Reconnect and try again.
          </AppText>
          <Action
            secondary
            onPress={() => {
              favorite.reset();
              void favorites.refetch();
            }}
          >
            Reload saved words
          </Action>
        </Surface>
      )}
      {showSaved && favorites.data && !favorites.isError && (
        <>
          {favorites.data.items.length === 0 ? (
            <Surface>
              <Icon name="heart" />
              <AppText variant="title">No saved affirmations yet.</AppText>
              <AppText tone="secondary">
                Tap Save to favorites on an affirmation to find it here later.
              </AppText>
              <Action onPress={() => setShowSaved(false)}>Read today’s words</Action>
            </Surface>
          ) : (
            favorites.data.items.map((item) => (
              <Surface key={item.id}>
                <AppText variant="title">{item.text}</AppText>
                <Action
                  secondary
                  icon="heart"
                  label={`Remove favorite: ${item.text}`}
                  disabled={favorite.isPending}
                  onPress={() => favorite.mutate({ id: item.id, saved: false })}
                >
                  Remove from favorites
                </Action>
              </Surface>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
