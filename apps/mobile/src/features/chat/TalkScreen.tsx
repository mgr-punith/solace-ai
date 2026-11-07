import { useRef, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Action, AppText } from '../../components/ui/primitives';
import { PageHeader, NavigationRow, IconButton, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
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
  const { sky } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [response, setResponse] = useState<string | null>(null);
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
          <View style={styles.header}>
            <PageHeader title="Talk with Sol" />
            <View style={[layoutStyles.row, fontScale > 1.2 && styles.stacked]}>
              <Companion size={tokens.sol.home} onResponse={setResponse} />
              <View style={layoutStyles.grow}>
                <AppText variant="heading">A place to talk.</AppText>
                <AppText variant="bodySmall" accessibilityLiveRegion="polite">
                  {response ?? 'Bring whatever is on your mind.'}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Tap Sol, or hold for a quiet breath
                </AppText>
              </View>
            </View>
            <Action icon="plus" disabled={create.isPending} onPress={() => void start()}>
              {create.isPending
                ? 'Opening conversation…'
                : create.isError
                  ? 'Retry new conversation'
                  : 'New conversation'}
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
            <AppText variant="heading">Your conversations</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.entry, layoutStyles.row, { borderColor: sky.surface }]}>
            <View style={layoutStyles.grow}>
              <NavigationRow
                icon="talk"
                title={item.title}
                label="Continue conversation"
                subtitle={new Date(item.createdAt).toLocaleString()}
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
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText>
              {query.isPending
                ? 'Opening your conversations…'
                : query.isError
                  ? 'Your saved chats are still in your account.'
                  : 'Your first conversation can start anywhere.'}
            </AppText>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {query.hasNextPage && (
              <Action
                secondary
                disabled={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              >
                Load earlier conversations
              </Action>
            )}
            <AppText variant="caption" tone="secondary">
              Sol is an AI companion, not a therapist. Memory across conversations is not active.
            </AppText>
            <ProviderNotice query={provider} />
            <NavigationRow
              icon="support"
              title="Need support now?"
              onPress={() => router.push('/support')}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: tokens.spacing.ml,
    width: '100%',
    maxWidth: tokens.maxWidth + tokens.spacing.ml * 2,
    alignSelf: 'center',
  },
  header: { gap: tokens.spacing.md, marginBottom: tokens.spacing.sm },
  entry: { borderBottomWidth: tokens.border, gap: tokens.spacing.xs },
  empty: { paddingVertical: tokens.spacing.md },
  footer: { gap: tokens.spacing.smd, paddingTop: tokens.spacing.ml },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
});
