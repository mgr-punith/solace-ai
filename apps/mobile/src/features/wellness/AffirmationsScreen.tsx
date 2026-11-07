import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { affirmationForDay, localDay, type ActivityInput } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { PageHeader, layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { deviceTimezone } from '../mood/hooks';
import { activityRequestId, useFavorite, useFavorites, useSaveActivity } from './hooks';
export function AffirmationsScreen() {
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [showSaved, setShowSaved] = useState(saved === '1');
  const { now, sky } = useTheme();
  const day = localDay(now, deviceTimezone());
  const [readDay, setReadDay] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ day: string; input: ActivityInput } | null>(null);
  const saving = useRef(false);
  const reading = useSaveActivity();
  const favorites = useFavorites();
  const favorite = useFavorite();
  const displayedDay = retry?.day ?? day;
  const today = affirmationForDay(displayedDay);
  const isFavorite = favorites.data?.items.some((item) => item.id === today.id) ?? false;
  async function markRead() {
    if (saving.current || readDay === day) return;
    saving.current = true;
    const pending = retry ?? {
      day,
      input: {
        requestId: activityRequestId(),
        timezone: deviceTimezone(),
        type: 'affirmation' as const,
        affirmationId: today.id,
      },
    };
    setRetry(pending);
    try {
      await reading.mutateAsync(pending.input);
      setReadDay(pending.day);
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
        subtitle="Take what resonates. Leave what doesn’t."
        back={() => (router.canGoBack() ? router.back() : router.replace('/wellness'))}
      />
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
            Read it slowly. You don’t have to feel differently right away.
          </AppText>
          <Action
            icon={readDay === day ? 'check' : 'book'}
            disabled={reading.isPending || readDay === day}
            onPress={() => void markRead()}
          >
            {readDay === day
              ? 'Added to today’s progress'
              : reading.isError
                ? 'Retry marking as read'
                : 'Mark as read'}
          </Action>
          {reading.isError && (
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
      {(favorites.isPending || reading.isPending) && (
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
              <AppText variant="title">Keep a few words close.</AppText>
              <AppText tone="secondary">
                Save an affirmation when it speaks to you. It will be here when you return.
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
