import { useScreenBack } from '../../lib/useScreenBack';
import { useRef, useState } from 'react';
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
import { deviceTimezone } from '../mood/hooks';
import { activityRequestId, useFavorite, useFavorites, useSaveActivity } from './hooks';
export function AffirmationsScreen() {
  const { saved, conversation } = useLocalSearchParams<{ saved?: string; conversation?: string }>();
  const parsedConversation = conversationSchema.shape.id.safeParse(conversation);
  const conversationId = parsedConversation.success ? parsedConversation.data : null;
  const goBack = useScreenBack(conversationId ? `/chat/${conversationId}` : '/wellness');
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
