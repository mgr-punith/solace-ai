import { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader, NavigationRow, IconButton, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useChatProvider } from './provider-info';
import { ProviderNotice } from './ProviderNotice';
import { useConversations, useDeleteConversation } from './hooks';
import { useStartConversation } from './useStartConversation';
import { conversationTitle, conversationTime } from './titles';

export function TalkScreen() {
  const provider = useChatProvider();
  const { sky } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [response, setResponse] = useState<string | null>(null);
  const query = useConversations();
  const create = useStartConversation();
  const deletion = useDeleteConversation();
  const conversations = query.data?.pages.flatMap((page) => page.items) ?? [];
  const newest = conversations[0];
  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });
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
        data={conversations.slice(1)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title="Talk with Sol" />
            <View style={[layoutStyles.row, fontScale > 1.5 && styles.stacked]}>
              <Companion size={tokens.sol.compact} onResponse={setResponse} />
              <View style={layoutStyles.grow}>
                <AppText variant="bodySmall" accessibilityLiveRegion="polite">
                  {response ?? 'What’s on your mind?'}
                </AppText>
              </View>
            </View>
            {newest && (
              <Surface>
                <View style={layoutStyles.row}>
                  <View style={layoutStyles.grow}>
                    <AppText variant="caption" tone="secondary">
                      Your newest conversation
                    </AppText>
                    <AppText variant="heading">{conversationTitle(newest)}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {conversationTime(newest)}
                    </AppText>
                  </View>
                  <IconButton
                    icon="delete"
                    label="Delete conversation"
                    disabled={deletion.isPending}
                    onPress={() => remove(newest.id)}
                  />
                </View>
                <Action icon="talk" onPress={() => open(newest.id)}>
                  Continue conversation
                </Action>
              </Surface>
            )}
            <Action
              icon="plus"
              secondary={!!newest}
              disabled={create.isPending}
              onPress={() => void create.start()}
            >
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
            {conversations.length > 1 && <AppText variant="heading">Earlier conversations</AppText>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.entry, layoutStyles.row, { borderColor: sky.surface }]}>
            <View style={layoutStyles.grow}>
              <NavigationRow
                icon="talk"
                title={conversationTitle(item)}
                label={`Continue ${conversationTitle(item)}, ${conversationTime(item)}`}
                subtitle={conversationTime(item)}
                onPress={() => open(item.id)}
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
          !newest ? (
            <View style={styles.empty}>
              <AppText>
                {query.isPending
                  ? 'Opening your conversations…'
                  : query.isError
                    ? 'Your saved chats are still in your account.'
                    : 'Start with a few words. Sol will take it from there.'}
              </AppText>
            </View>
          ) : undefined
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
            <ProviderNotice query={provider} compact />
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
