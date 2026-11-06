import { memo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ChatMessage, SendMessageInput } from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthApiError } from '../../lib/api';
import { newChatRequestId, useMessages, useSendMessage } from './hooks';

const Message = memo(function Message({ item }: { item: ChatMessage }) {
  return (
    <Surface style={styles.message}>
      <AppText variant="caption" tone="secondary">
        {item.role === 'user' ? 'You' : 'Sol'}
      </AppText>
      <AppText selectable>{item.content || 'Sol is preparing a reply…'}</AppText>
      {item.kind === 'crisis' && (
        <Action secondary onPress={() => router.push('/support')}>
          Need support now?
        </Action>
      )}
    </Surface>
  );
});

export function ChatScreen({ id }: { id: string }) {
  const query = useMessages(id);
  const send = useSendMessage(id);
  const { sky, fontsLoaded } = useTheme();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SendMessageInput | null>(null);
  const busy = useRef(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const lastScrolled = useRef<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const items = [...new Map(rows.map((item) => [item.id, item])).values()].sort(
    (a, b) => a.sequence - b.sequence,
  );
  const last = items.at(-1);
  const retryTurn =
    last?.role === 'assistant' && last.status !== 'complete'
      ? items.find((item) => item.role === 'user' && item.requestId === last.requestId)
      : undefined;
  const retryInput =
    pending ?? (retryTurn ? { requestId: retryTurn.requestId, content: retryTurn.content } : null);
  const missing =
    query.error instanceof AuthApiError && query.error.code === 'CONVERSATION_NOT_FOUND';
  const terminalSendError =
    send.error instanceof AuthApiError &&
    ['MESSAGE_STALE', 'MESSAGE_CONFLICT', 'CONVERSATION_NOT_FOUND'].includes(send.error.code);
  async function submit(input?: SendMessageInput) {
    if (busy.current) return;
    const value = input ?? retryInput ?? { requestId: newChatRequestId(), content: draft.trim() };
    if (!value.content || value.content.length > 2000) return;
    busy.current = true;
    setPending(value);
    setError(null);
    try {
      const result = await send.mutateAsync(value);
      setDraft('');
      setPending(null);
      if (result.assistantMessage.status === 'failed')
        setError('Sol couldn’t reply. Your message is saved; you can retry it below.');
      await query.refetch();
      list.current?.scrollToEnd({ animated: false });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Your message couldn’t be sent. Try again.',
      );
    } finally {
      busy.current = false;
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <View style={[styles.header, fontScale > 1.2 && styles.largeHeader]}>
          <View style={styles.headerAction}>
            <Action
              secondary
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/talk'))}
            >
              Chats
            </Action>
          </View>
          <AppText variant="heading">Sol</AppText>
          <View style={styles.headerAction}>
            <Action secondary label="Need support now?" onPress={() => router.push('/support')}>
              Support
            </Action>
          </View>
        </View>
        <FlatList
          ref={list}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Message item={item} />}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            const key = last ? `${last.id}-${last.status}` : null;
            if (key && key !== lastScrolled.current) {
              lastScrolled.current = key;
              list.current?.scrollToEnd({ animated: false });
            }
          }}
          ListHeaderComponent={
            query.hasNextPage ? (
              <Action
                secondary
                disabled={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              >
                Load earlier messages
              </Action>
            ) : undefined
          }
          ListEmptyComponent={
            <Surface>
              <AppText>
                {query.isPending
                  ? 'Opening this conversation…'
                  : query.isError
                    ? missing
                      ? 'This conversation was deleted or is unavailable.'
                      : 'The conversation couldn’t be loaded.'
                    : 'Say what’s on your mind. We can take it one message at a time.'}
              </AppText>
              {!query.isPending && !query.isError && (
                <AppText variant="bodySmall" tone="secondary">
                  Sol is an AI companion. Messages are saved in your account and sent to VyceAi for
                  replies.
                </AppText>
              )}
            </Surface>
          }
        />
        <View style={styles.composer}>
          {query.isError && !missing && (
            <>
              <AppText accessibilityRole="alert">
                Your messages couldn’t be loaded. Try again.
              </AppText>
              <Action secondary onPress={() => void query.refetch()}>
                Reload conversation
              </Action>
            </>
          )}
          {error && <AppText accessibilityRole="alert">{error}</AppText>}
          {send.isPending && (
            <View accessibilityLiveRegion="polite">
              <ActivityIndicator color={sky.palette.text} />
              <AppText>Sol is thinking…</AppText>
            </View>
          )}
          {pending && !items.some((item) => item.requestId === pending.requestId) && (
            <AppText
              variant="bodySmall"
              numberOfLines={2}
            >{`${send.isPending ? 'Sending' : 'Not confirmed'}: ${pending.content}`}</AppText>
          )}
          {terminalSendError && (
            <Action
              secondary
              onPress={() => {
                setPending(null);
                setError(null);
                send.reset();
                void query.refetch();
              }}
            >
              Reload saved messages
            </Action>
          )}
          {retryInput && !send.isPending && !terminalSendError && (
            <Action onPress={() => void submit(retryInput)}>Retry message</Action>
          )}
          {!missing && !query.isPending && !query.isError && (
            <>
              <TextInput
                accessibilityLabel="Message Sol"
                placeholder="What’s on your mind?"
                placeholderTextColor={sky.palette.secondary}
                multiline
                maxLength={2000}
                value={draft}
                onChangeText={setDraft}
                editable={!send.isPending && !retryInput}
                style={[
                  styles.input,
                  {
                    color: sky.palette.text,
                    borderColor: sky.palette.secondary,
                    fontFamily: fontsLoaded ? tokens.type.body.fontFamily : undefined,
                  },
                ]}
              />
              <Action
                disabled={send.isPending || !!retryInput || !draft.trim()}
                onPress={() => void submit()}
              >
                Send message
              </Action>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeHeader: { flexWrap: 'wrap' },
  headerAction: { flex: 1 },
  messages: { padding: tokens.spacing.md, gap: tokens.spacing.sm, flexGrow: 1 },
  message: { padding: tokens.spacing.md, gap: tokens.spacing.sm },
  composer: { padding: tokens.spacing.md, gap: tokens.spacing.sm },
  input: {
    ...tokens.type.body,
    minHeight: tokens.target,
    maxHeight: tokens.target * 3,
    padding: tokens.spacing.sm,
    borderWidth: tokens.border,
    borderRadius: tokens.radius.input,
  },
});
