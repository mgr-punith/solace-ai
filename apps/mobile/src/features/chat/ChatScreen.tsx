import { useScreenBack } from '../../lib/useScreenBack';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ChatMessage, SendMessageInput } from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { IconButton, layoutStyles } from '../../components/ui/layout';
import Sol from '../../components/sol/Sol';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthApiError } from '../../lib/api';
import { newChatRequestId, useMessages, useSendMessage } from './hooks';
import { useChatProvider } from './provider-info';
import { ProviderNotice } from './ProviderNotice';
import { useChatDraft } from './useChatDraft';

const Message = memo(function Message({ item }: { item: ChatMessage }) {
  const isUser = item.role === 'user';
  return (
    <Surface
      style={[
        styles.message,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          maxWidth: isUser ? '92%' : '100%',
          backgroundColor: isUser ? tokens.action.background : tokens.colors.clear,
          borderWidth: 0,
          paddingHorizontal: isUser ? tokens.spacing.md : 0,
          borderBottomRightRadius: isUser ? tokens.spacing.xs : tokens.radius.surface,
          borderBottomLeftRadius: isUser ? tokens.radius.surface : tokens.spacing.xs,
        },
      ]}
    >
      {!isUser && (
        <AppText variant="caption" tone="secondary">
          Sol
        </AppText>
      )}
      <AppText selectable style={isUser && { color: tokens.action.text }}>
        {item.content || 'Sol is preparing a reply…'}
      </AppText>
      {item.kind === 'crisis' && (
        <Action secondary onPress={() => router.push('/support')}>
          Need support now?
        </Action>
      )}
    </Surface>
  );
});

export function ChatScreen({ id }: { id: string }) {
  const goBack = useScreenBack('/talk');
  const provider = useChatProvider();
  const canSend = !!provider.data && !provider.isError;
  const query = useMessages(id);
  const send = useSendMessage(id);
  const { sky, fontsLoaded, active, reduceMotion } = useTheme();
  const draftState = useChatDraft(id);
  const { text: draft, pending, origin } = draftState.draft;
  const updateDraft = draftState.update;
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const lastScrolled = useRef<string | null>(null);
  const nearBottom = useRef(true);
  const followReply = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const { fontScale } = useWindowDimensions();
  const items = useMemo(() => {
    const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
    return [...new Map(rows.map((item) => [item.id, item])).values()].sort(
      (a, b) => a.sequence - b.sequence,
    );
  }, [query.data]);
  const last = items.at(-1);
  const pendingComplete =
    !!pending &&
    items.some(
      (item) =>
        item.role === 'assistant' &&
        item.requestId === pending.requestId &&
        item.status === 'complete',
    );
  useEffect(() => {
    if (pendingComplete) {
      updateDraft({ pending: null, text: '', origin: null });
      setError(null);
    }
  }, [pendingComplete, updateDraft]);
  const retryTurn =
    last?.role === 'assistant' && last.status !== 'complete'
      ? items.find((item) => item.role === 'user' && item.requestId === last.requestId)
      : undefined;
  const retryInput =
    (pendingComplete ? null : pending) ??
    (retryTurn ? { requestId: retryTurn.requestId, content: retryTurn.content } : null);
  const missing =
    query.error instanceof AuthApiError && query.error.code === 'CONVERSATION_NOT_FOUND';
  const terminalSendError =
    send.error instanceof AuthApiError &&
    ['MESSAGE_STALE', 'MESSAGE_CONFLICT', 'CONVERSATION_NOT_FOUND'].includes(send.error.code);
  async function submit(input?: SendMessageInput) {
    if (busy.current || !canSend) return;
    const value = input ?? retryInput ?? { requestId: newChatRequestId(), content: draft.trim() };
    if (!value.content || value.content.length > 2000) return;
    busy.current = true;
    draftState.update({ pending: value });
    followReply.current = true;
    setError(null);
    try {
      const result = await send.mutateAsync(value);
      draftState.update({ text: '', pending: null, origin: null });
      if (result.assistantMessage.status === 'failed')
        setError('Sol couldn’t reply. Your message is saved; you can retry it below.');
      await query.refetch();
      if (followReply.current) list.current?.scrollToEnd({ animated: false });
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
        <View
          style={[
            { backgroundColor: sky.surface },
            styles.header,
            fontScale > 1.2 && styles.largeHeader,
          ]}
        >
          <IconButton icon="back" label="Chats" onPress={goBack} />
          <View style={[layoutStyles.row, layoutStyles.grow]}>
            <Sol
              state={send.isPending ? 'thinking' : 'idle'}
              mood={2}
              size={tokens.sol.mini}
              active={active && send.isPending}
              reduceMotion={reduceMotion}
              greeting={0}
            />
            <View style={layoutStyles.grow}>
              <AppText variant="heading">Sol</AppText>
              <AppText variant="caption" tone="secondary">
                AI companion
              </AppText>
            </View>
          </View>
          {last?.role === 'assistant' &&
            last.status === 'complete' &&
            last.kind === 'normal' &&
            !send.isPending && (
              <IconButton
                icon="wind"
                label="Take a breathing break"
                onPress={() => {
                  Keyboard.dismiss();
                  router.push({ pathname: '/breathing', params: { conversation: id } });
                }}
              />
            )}
          <IconButton
            icon="support"
            label="Need support now?"
            onPress={() => router.push('/support')}
          />
        </View>
        <FlatList
          testID="chat-messages"
          ref={list}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Message item={item} />}
          contentContainerStyle={[styles.messages, items.length === 0 && styles.emptyMessages]}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScrollBeginDrag={() => {
            followReply.current = false;
          }}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
            nearBottom.current =
              contentSize.height - contentOffset.y - layoutMeasurement.height < tokens.target * 2;
            if (nearBottom.current) setShowLatest(false);
          }}
          scrollEventThrottle={16}
          onLayout={() => {
            if (nearBottom.current) list.current?.scrollToEnd({ animated: false });
          }}
          onContentSizeChange={() => {
            const key = last ? `${last.id}-${last.status}` : null;
            if (key && key !== lastScrolled.current) {
              const first = !lastScrolled.current;
              lastScrolled.current = key;
              if (first || nearBottom.current || followReply.current)
                list.current?.scrollToEnd({ animated: false });
              else setShowLatest(true);
            }
          }}
          ListHeaderComponent={
            query.hasNextPage ? (
              <Action
                secondary
                disabled={query.isFetchingNextPage}
                onPress={() => {
                  followReply.current = false;
                  void query.fetchNextPage();
                }}
              >
                Load earlier messages
              </Action>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {!query.isPending && !query.isError && (
                <Sol
                  state="idle"
                  mood={2}
                  size={tokens.sol.compact}
                  active={false}
                  reduceMotion
                  greeting={0}
                />
              )}
              <AppText variant="title" style={styles.centeredText}>
                {query.isPending
                  ? 'Opening this conversation…'
                  : query.isError
                    ? missing
                      ? 'This conversation was deleted or is unavailable.'
                      : 'The conversation couldn’t be loaded.'
                    : origin === 'checkin'
                      ? 'Your check-in is ready to talk about.'
                      : 'What’s on your mind?'}
              </AppText>
              {!query.isPending && !query.isError && (
                <AppText variant="bodySmall" tone="secondary" style={styles.centeredText}>
                  {origin
                    ? 'Read or edit your message below. Nothing is sent until you choose Send.'
                    : 'A few words is a good place to start.'}
                </AppText>
              )}
              {!query.isPending && !query.isError && !draft && (
                <View style={styles.starters}>
                  <Action
                    secondary
                    icon="talk"
                    onPress={() =>
                      updateDraft({ text: 'I’d like to talk through my day.', origin: null })
                    }
                  >
                    Talk through my day
                  </Action>
                  <Action
                    secondary
                    icon="wind"
                    onPress={() =>
                      updateDraft({ text: 'I need a moment to slow down.', origin: null })
                    }
                  >
                    Help me slow down
                  </Action>
                </View>
              )}
            </View>
          }
        />
        <View style={[styles.composer, { backgroundColor: sky.surface }]}>
          {showLatest && (
            <Action
              variant="quiet"
              onPress={() => {
                followReply.current = true;
                list.current?.scrollToEnd({ animated: !reduceMotion });
                setShowLatest(false);
              }}
            >
              Latest messages
            </Action>
          )}
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
            <View accessibilityLiveRegion="polite" style={layoutStyles.row}>
              <ActivityIndicator color={sky.palette.text} />
              <AppText variant="bodySmall">Sol is thinking…</AppText>
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
                draftState.update({ pending: null });
                setError(null);
                send.reset();
                void query.refetch();
              }}
            >
              Reload saved messages
            </Action>
          )}
          {retryInput && !send.isPending && !terminalSendError && (
            <Action disabled={!canSend} onPress={() => void submit(retryInput)}>
              Retry message
            </Action>
          )}
          {!missing && !query.isPending && !query.isError && (
            <>
              {origin && !retryInput && (
                <View style={layoutStyles.row}>
                  <AppText variant="caption" tone="secondary" style={layoutStyles.grow}>
                    {origin === 'checkin'
                      ? 'From your check-in · review before sending'
                      : 'After your breathing break · review before sending'}
                  </AppText>
                  <IconButton
                    icon="close"
                    label="Clear prepared message"
                    onPress={() => draftState.update({ text: '', origin: null })}
                  />
                </View>
              )}
              <View style={[styles.inputRow, { borderColor: sky.palette.secondary }]}>
                <TextInput
                  accessibilityLabel="Message Sol"
                  placeholder="What’s on your mind?"
                  placeholderTextColor={sky.palette.secondary}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                  value={draft}
                  onChangeText={(text) => draftState.update({ text })}
                  editable={!send.isPending && !retryInput}
                  style={[
                    styles.input,
                    {
                      color: sky.palette.text,
                      fontFamily: fontsLoaded ? tokens.type.body.fontFamily : undefined,
                      maxHeight: Math.max(
                        tokens.target * 2,
                        tokens.type.body.lineHeight * fontScale * 4,
                      ),
                    },
                  ]}
                />
                <IconButton
                  icon="send"
                  label="Send message"
                  primary
                  disabled={!canSend || send.isPending || !!retryInput || !draft.trim()}
                  onPress={() => void submit()}
                />
              </View>
            </>
          )}
          <ProviderNotice query={provider} compact />
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
  messages: { padding: tokens.spacing.md, gap: tokens.spacing.sm, flexGrow: 1 },
  message: { padding: tokens.spacing.sm, gap: tokens.spacing.xs },
  composer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  emptyMessages: { justifyContent: 'center' },
  empty: { alignItems: 'center', gap: tokens.spacing.smd, paddingVertical: tokens.spacing.lg },
  starters: { alignSelf: 'stretch', gap: tokens.spacing.sm, paddingTop: tokens.spacing.md },
  centeredText: { textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.xs,
    borderRadius: tokens.radius.input + tokens.spacing.xs,
    borderWidth: tokens.border,
    padding: tokens.spacing.xs,
  },
  input: {
    ...tokens.type.body,
    minHeight: tokens.target,
    flex: 1,
    padding: tokens.spacing.smd,
    borderRadius: tokens.radius.input,
  },
});
