import { ProgressSummary } from '../progress/ProgressSummary';
import { PageHeader } from '../../components/ui/layout';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { MoodCheckin } from '@solace/shared';
import { AppText, Action, Surface } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { useMoodHistory, useDeleteMood } from './hooks';

const Entry = memo(function Entry({
  entry,
  onDelete,
  disabled,
}: {
  entry: MoodCheckin;
  onDelete: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <Surface>
      <AppText variant="caption" tone="secondary">
        {new Date(entry.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </AppText>
      <AppText variant="title">{moods[entry.mood - 1]?.label}</AppText>
      {entry.tags.length > 0 && (
        <AppText variant="bodySmall" tone="secondary">
          {entry.tags.join(' · ')}
        </AppText>
      )}
      {entry.note ? <AppText>{entry.note}</AppText> : null}
      <Action
        secondary
        disabled={disabled}
        label={`Delete ${moods[entry.mood - 1]?.label} check-in from ${new Date(entry.createdAt).toLocaleDateString()}`}
        onPress={() => onDelete(entry.id)}
      >
        Delete check-in
      </Action>
    </Surface>
  );
});
export function HistoryScreen() {
  const query = useMoodHistory();
  const deletion = useDeleteMood();
  const { sky } = useTheme();
  const { mutate } = deletion;
  const confirm = useCallback(
    (id: string) => {
      const remove = () => mutate(id);
      if (Platform.OS === 'web') {
        if (window.confirm('Delete this check-in and its note?')) remove();
        return;
      }
      Alert.alert('Delete this check-in?', 'Its mood, tags and note will be permanently removed.', [
        { text: 'Keep check-in', style: 'cancel' },
        { text: 'Delete check-in', style: 'destructive', onPress: remove },
      ]);
    },
    [mutate],
  );
  const renderItem = useCallback(
    ({ item }: { item: MoodCheckin }) => (
      <Entry entry={item} onDelete={confirm} disabled={deletion.isPending} />
    ),
    [confirm, deletion.isPending],
  );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.lg }}>
            <PageHeader title="Your moments" subtitle="A little perspective, without judgment." />
            <ProgressSummary />
            <Surface style={styles.header}>
              <AppText variant="heading" accessibilityRole="header">
                Your check-ins
              </AppText>
              <AppText tone="secondary">
                Moments you’ve made space for. Every feeling belongs here.
              </AppText>
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
                    Try loading again
                  </Action>
                </>
              )}
              {deletion.isPending && (
                <ActivityIndicator
                  color={sky.palette.text}
                  accessibilityLabel="Deleting check-in"
                />
              )}
            </Surface>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <Surface>
              <ActivityIndicator color={sky.palette.text} accessibilityLabel="Loading check-ins" />
              <AppText>Opening your check-ins…</AppText>
            </Surface>
          ) : !query.isError ? (
            <Surface>
              <AppText variant="heading">Your first check-in can be today.</AppText>
              <AppText tone="secondary">A few words or just a feeling is enough.</AppText>
              <Action onPress={() => router.navigate('/home')}>Check in</Action>
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
                {query.isFetchingNextPage ? 'Loading more…' : 'Load earlier check-ins'}
              </Action>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: tokens.spacing.lg,
    width: '100%',
    maxWidth: tokens.maxWidth + tokens.spacing.lg * 2,
    alignSelf: 'center',
  },
  header: { marginBottom: tokens.spacing.lg },
  separator: { height: tokens.spacing.md },
  footer: { paddingVertical: tokens.spacing.lg },
});
