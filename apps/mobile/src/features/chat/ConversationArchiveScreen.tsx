import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Conversation } from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader } from '../../components/ui/layout';
import { ConfirmSheet, type ConfirmSheetState } from '../../components/ui/ConfirmSheet';
import { useLayoutMetrics } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { useScreenBack } from '../../lib/useScreenBack';
import { ConversationRow } from './ConversationRow';
import { useConversations, useDeleteConversation } from './hooks';

export function ConversationArchiveScreen() {
  const goBack = useScreenBack('/talk');
  const query = useConversations();
  const deletion = useDeleteConversation();
  const { sky } = useTheme();
  const layout = useLayoutMetrics();
  const [confirmation, setConfirmation] = useState<ConfirmSheetState | null>(null);
  const open = useCallback(
    (id: string) => router.push({ pathname: '/chat/[id]', params: { id } }),
    [],
  );
  const confirm = useCallback(
    (id: string) => {
      setConfirmation({
        title: 'Delete this conversation?',
        message: 'Its messages will be permanently removed.',
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
          renderItem={({ item, index }: { item: Conversation; index: number }) => (
            <ConversationRow
              item={item}
              first={index === 0}
              deleting={deletion.isPending}
              onOpen={open}
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
              <PageHeader title="All conversations" subtitle="Newest first" back={goBack} />
              {(query.isError || deletion.isError) && (
                <>
                  <AppText tone="error" accessibilityRole="alert">
                    {deletion.error?.message ?? 'Your conversations couldn’t be loaded. Try again.'}
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
                  accessibilityLabel="Deleting conversation"
                />
              )}
            </View>
          }
          ListEmptyComponent={
            query.isPending ? (
              <Surface>
                <ActivityIndicator
                  color={sky.palette.text}
                  accessibilityLabel="Loading conversations"
                />
                <AppText variant="bodySmall" tone="secondary">
                  Opening your conversations…
                </AppText>
              </Surface>
            ) : !query.isError ? (
              <Surface>
                <AppText variant="heading">No conversations yet</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Start a conversation with Sol from Talk.
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
