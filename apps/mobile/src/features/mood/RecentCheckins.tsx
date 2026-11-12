import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { CheckinRow } from './CheckinRow';
import { useDeleteMood, useRecentMoods } from './hooks';
import { ConfirmSheet, type ConfirmSheetState } from '../../components/ui/ConfirmSheet';

export function RecentCheckins() {
  const query = useRecentMoods(3);
  const deletion = useDeleteMood();
  const { sky } = useTheme();
  const [confirmation, setConfirmation] = useState<ConfirmSheetState | null>(null);
  const confirm = useCallback(
    (id: string) => {
      setConfirmation({
        title: 'Delete this check-in?',
        message: 'Its mood, tags and note will be permanently removed.',
        cancelLabel: 'Cancel',
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
        onConfirm: () => {
          void deletion
            .mutateAsync(id)
            .then(() => setConfirmation(null))
            .catch(() => {});
        },
      });
    },
    [deletion],
  );
  const items = query.data?.items ?? [];
  return (
    <>
      <Surface>
        <View style={layoutStyles.row}>
          <View style={layoutStyles.grow}>
            <AppText variant="heading" accessibilityRole="header">
              Recent check-ins
            </AppText>
            <AppText variant="caption" tone="secondary">
              Your latest three
            </AppText>
          </View>
          <Action variant="quiet" onPress={() => router.push('/check-ins')}>
            View all
          </Action>
        </View>
        {query.isPending ? (
          <View style={layoutStyles.row}>
            <ActivityIndicator color={sky.palette.text} accessibilityLabel="Loading check-ins" />
            <AppText variant="bodySmall" tone="secondary">
              Opening recent check-ins…
            </AppText>
          </View>
        ) : query.isError ? (
          <>
            <AppText tone="error" accessibilityRole="alert">
              Recent check-ins couldn’t be loaded.
            </AppText>
            <Action secondary onPress={() => void query.refetch()}>
              Try again
            </Action>
          </>
        ) : items.length === 0 ? (
          <>
            <AppText variant="bodySmall" tone="secondary">
              Your first check-in can be today.
            </AppText>
            <Action onPress={() => router.navigate('/home')}>Check in</Action>
          </>
        ) : (
          items.map((entry, index) => (
            <CheckinRow
              key={entry.id}
              entry={entry}
              first={index === 0}
              disabled={deletion.isPending}
              onDelete={confirm}
            />
          ))
        )}
      </Surface>
      <ConfirmSheet
        state={confirmation}
        onDismiss={() => setConfirmation(null)}
        pending={deletion.isPending}
      />
    </>
  );
}
