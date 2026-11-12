import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MoodCheckin } from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { useLayoutMetrics } from '../../theme/layout';
import { useScreenBack } from '../../lib/useScreenBack';
import { CheckinRow } from './CheckinRow';
import { useDeleteMood, useMoodHistory } from './hooks';
import { ConfirmSheet, type ConfirmSheetState } from '../../components/ui/ConfirmSheet';

export function CheckinArchiveScreen() {
  const goBack = useScreenBack('/progress');
  const query = useMoodHistory();
  const deletion = useDeleteMood();
  const { sky } = useTheme();
  const layout = useLayoutMetrics();
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
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
        <FlatList
          style={styles.screen}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: { item: MoodCheckin; index: number }) => (
            <CheckinRow
              entry={item}
              first={index === 0}
              disabled={deletion.isPending}
              onDelete={confirm}
            />
          )}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: layout.gutter, paddingTop: layout.top },
          ]}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListHeaderComponent={
            <View style={styles.header}>
              <PageHeader title="All check-ins" subtitle="Newest first" back={goBack} />
              {(query.isError || deletion.isError) && (
                <>
                  <AppText tone="error" accessibilityRole="alert">
                    {deletion.error?.message ?? 'Your check-ins couldn’t be loaded. Try again.'}
                  </AppText>
                  <Action
                    secondary
                    onPress={() => {
                      deletion.reset();
                      void query.refetch();
                    }}
                  >
                    Try again
                  </Action>
                </>
              )}
              {deletion.isPending && (
                <ActivityIndicator
                  color={sky.palette.text}
                  accessibilityLabel="Deleting check-in"
                />
              )}
            </View>
          }
          ListEmptyComponent={
            query.isPending ? (
              <Surface>
                <ActivityIndicator
                  color={sky.palette.text}
                  accessibilityLabel="Loading check-ins"
                />
                <AppText variant="bodySmall" tone="secondary">
                  Opening your check-ins…
                </AppText>
              </Surface>
            ) : !query.isError ? (
              <Surface>
                <AppText variant="heading">No check-ins yet</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Your saved moods will appear here.
                </AppText>
              </Surface>
            ) : undefined
          }
          ListFooterComponent={
            query.hasNextPage ? (
              <View style={styles.footer}>
                <Action
                  secondary
                  disabled={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? 'Loading…' : 'Load earlier'}
                </Action>
              </View>
            ) : undefined
          }
        />
      </SafeAreaView>
      <ConfirmSheet
        state={confirmation}
        onDismiss={() => setConfirmation(null)}
        pending={deletion.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingBottom: tokens.spacing.lg,
    width: '100%',
    maxWidth: tokens.maxWidth + tokens.spacing.ml * 2,
    alignSelf: 'center',
  },
  header: { gap: tokens.spacing.smd, paddingBottom: tokens.spacing.smd },
  footer: { paddingVertical: tokens.spacing.lg },
});
