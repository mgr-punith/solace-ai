import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { useLayoutMetrics } from '../../theme/layout';
import { ConfirmSheet, type ConfirmSheetState } from '../../components/ui/ConfirmSheet';
import { ConversationRow } from './ConversationRow';

export function TalkScreen() {
  const provider = useChatProvider();
  const { sky } = useTheme();
  const layout = useLayoutMetrics();
  const { fontScale } = useWindowDimensions();
  const [response, setResponse] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmSheetState | null>(null);
  const query = useConversations();
  const create = useStartConversation();
  const deletion = useDeleteConversation();
  const conversations = query.data?.pages.flatMap((page) => page.items) ?? [];
  const newest = conversations[0];
  const open = (id: string) => router.push({ pathname: '/chat/[id]', params: { id } });
  const dismissConfirmation = useCallback(() => setConfirmation(null), []);
  function remove(id: string) {
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
  }
  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <FlatList
          style={styles.screen}
          data={conversations.slice(1, 4)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: layout.gutter, paddingTop: layout.top },
          ]}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={layoutStyles.row}>
                <View style={layoutStyles.grow}>
                  <PageHeader title="Talk" subtitle="Conversations with Sol" />
                </View>
                <IconButton
                  icon="plus"
                  label={create.isError ? 'Retry new conversation' : 'New conversation'}
                  primary
                  disabled={create.isPending}
                  onPress={() => void create.start()}
                />
              </View>
              <View
                style={[
                  styles.solIntro,
                  { backgroundColor: sky.surface, borderColor: sky.outline },
                  fontScale > 1.5 && styles.stacked,
                ]}
              >
                <Companion size={tokens.sol.compact} onResponse={setResponse} />
                <View style={layoutStyles.grow}>
                  <AppText variant="caption" tone="secondary">
                    Sol · AI companion
                  </AppText>
                  <AppText variant="bodySmall" accessibilityLiveRegion="polite">
                    {response ?? 'What’s on your mind?'}
                  </AppText>
                </View>
              </View>
              {newest && (
                <Surface style={styles.featured}>
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
                  <Action icon="talk" label="Continue conversation" onPress={() => open(newest.id)}>
                    Continue
                  </Action>
                </Surface>
              )}
              {create.isPending && (
                <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">
                  Opening conversation…
                </AppText>
              )}
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
              {conversations.length > 1 && (
                <View style={styles.sectionHeading}>
                  <View>
                    <AppText variant="heading">Recent conversations</AppText>
                    <AppText variant="caption" tone="secondary">
                      Your latest three
                    </AppText>
                  </View>
                  <Action variant="quiet" onPress={() => router.push('/conversations')}>
                    View all
                  </Action>
                </View>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <ConversationRow
              item={item}
              first={index === 0}
              deleting={deletion.isPending}
              onOpen={open}
              onDelete={remove}
            />
          )}
          ListEmptyComponent={
            !newest ? (
              <View style={styles.empty}>
                <AppText>
                  {query.isPending
                    ? 'Opening your conversations…'
                    : query.isError
                      ? 'Your saved chats are still in your account.'
                      : 'Tell Sol about your day, or ask a question.'}
                </AppText>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            <View style={styles.footer}>
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
      <ConfirmSheet
        state={confirmation}
        onDismiss={dismissConfirmation}
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
  header: { gap: tokens.spacing.md, marginBottom: tokens.spacing.sm },
  solIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    borderWidth: tokens.border,
    borderRadius: tokens.radius.surface,
    padding: tokens.spacing.smd,
  },
  featured: { gap: tokens.spacing.sm, padding: tokens.spacing.smd },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  empty: { paddingVertical: tokens.spacing.md },
  footer: { gap: tokens.spacing.smd, paddingTop: tokens.spacing.ml },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
});
