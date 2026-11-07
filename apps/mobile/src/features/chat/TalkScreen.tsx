import { useRef } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader, NavigationRow, IconButton, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { tokens } from '../../theme/tokens';
import { useChatProvider } from './provider-info';
import { ProviderNotice } from './ProviderNotice';
import {
  newChatRequestId,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from './hooks';

export function TalkScreen() {
  const provider = useChatProvider();
  const query = useConversations();
  const create = useCreateConversation();
  const deletion = useDeleteConversation();
  const requestId = useRef<string | null>(null);
  const starting = useRef(false);
  async function start() {
    if (starting.current) return;
    starting.current = true;
    requestId.current ??= newChatRequestId();
    try {
      const conversation = await create.mutateAsync(requestId.current);
      requestId.current = null;
      router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
    } catch {
      /* Mutation renders a recoverable error and retains the creation key. */
    } finally {
      starting.current = false;
    }
  }
  function remove(id: string) {
    const action = () => deletion.mutate(id);
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this conversation and all its messages?')) action();
      return;
    }
    Alert.alert('Delete this conversation?', 'All its messages will be permanently removed.', [
      { text: 'Keep conversation', style: 'cancel' },
      { text: 'Delete conversation', style: 'destructive', onPress: action },
    ]);
  }
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={query.data?.pages.flatMap((page) => page.items) ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg }}>
            <PageHeader
              title="Talk with Sol"
              subtitle="You don’t have to find the perfect words."
            />
            <Companion size={tokens.sol.onboarding} />
            <Surface>
              <AppText>Bring what’s on your mind. You can return to any conversation.</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Sol is an AI companion, not a therapist. Memory across conversations is not active.
              </AppText>
              <ProviderNotice query={provider} />
              <Action icon="plus" disabled={create.isPending} onPress={() => void start()}>
                {create.isPending
                  ? 'Opening conversation…'
                  : create.isError
                    ? 'Retry new conversation'
                    : 'New conversation'}
              </Action>
              <Action secondary onPress={() => router.push('/support')}>
                Need support now?
              </Action>
              {(query.isError || create.isError || deletion.isError) && (
                <>
                  <AppText accessibilityRole="alert">
                    {create.error?.message ??
                      deletion.error?.message ??
                      'Your conversations couldn’t be loaded. Try again.'}
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
            </Surface>
          </View>
        }
        renderItem={({ item }) => (
          <Surface style={styles.entry}>
            <AppText variant="heading">{item.title}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {new Date(item.createdAt).toLocaleString()}
            </AppText>
            <View style={layoutStyles.row}>
              <View style={layoutStyles.grow}>
                <NavigationRow
                  icon="talk"
                  title="Continue conversation"
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
                />
              </View>
              <IconButton
                icon="delete"
                label="Delete conversation"
                disabled={deletion.isPending}
                onPress={() => remove(item.id)}
              />
            </View>
          </Surface>
        )}
        ListEmptyComponent={
          <Surface style={styles.entry}>
            <AppText>
              {query.isPending
                ? 'Opening your conversations…'
                : query.isError
                  ? 'Your saved chats are still in your account.'
                  : 'Your first conversation can start anywhere.'}
            </AppText>
          </Surface>
        }
        ListFooterComponent={
          query.hasNextPage ? (
            <Action
              secondary
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            >
              Load earlier conversations
            </Action>
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
  entry: { marginVertical: tokens.spacing.sm },
});
