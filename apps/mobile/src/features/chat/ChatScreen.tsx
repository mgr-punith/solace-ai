import { useScreenBack } from '../../lib/useScreenBack';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  chatActivitySchema,
  type ChatActivity,
  type ChatMessage,
  type SendMessageInput,
} from '@solace/shared';
import { Action, AppText } from '../../components/ui/primitives';
import { IconButton, layoutStyles } from '../../components/ui/layout';
import Sol from '../../components/sol/Sol';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthApiError } from '../../lib/api';
import { newChatRequestId, useMessages, useSendMessage } from './hooks';
import { useChatProvider } from './provider-info';
import { ProviderNotice } from './ProviderNotice';
import { useChatDraft } from './useChatDraft';
import { ChatBubble, ThinkingBubble, type ClaimEntrance } from './ChatBubble';

const activities = {
  breathing: { label: 'Breathe for a minute', icon: 'wind', pathname: '/breathing' },
  affirmation: { label: 'Read today’s words', icon: 'book', pathname: '/affirmations' },
} as const;

function openActivity(activity: ChatActivity, conversation: string) {
  Keyboard.dismiss();
  router.push({ pathname: activities[activity].pathname, params: { conversation } });
}

const Message = memo(function Message({
  item,
  showActivities,
  conversationId,
  motionActive,
  claimEntrance,
  delivery,
}: {
  item: ChatMessage;
  showActivities: boolean;
  conversationId: string;
  motionActive: boolean;
  claimEntrance: ClaimEntrance;
  delivery?: 'sending' | 'unconfirmed' | undefined;
}) {
  const isUser = item.role === 'user';
  const parsed = chatActivitySchema.safeParse(item.activity);
  const activity =
    !isUser &&
    showActivities &&
    item.kind === 'normal' &&
    item.status === 'complete' &&
    parsed.success
      ? parsed.data
      : null;
  return (
    <ChatBubble
      isUser={isUser}
      motionActive={motionActive}
      entranceKey={`${item.requestId}-${item.role}-${item.status}`}
      claimEntrance={claimEntrance}
      immediate={item.kind === 'crisis' || (item.status !== 'complete' && !isUser)}
    >
      {!isUser && (
        <AppText variant="caption" tone="secondary">
          Sol
        </AppText>
      )}
      <AppText selectable style={isUser && { color: tokens.action.text }}>
        {item.content || 'Sol is preparing a reply…'}
      </AppText>
      {delivery && (
        <AppText
          variant="caption"
          accessibilityLiveRegion="polite"
          style={{ color: tokens.action.text }}
        >
          {delivery === 'sending' ? 'Sending…' : 'Not confirmed · retry below'}
        </AppText>
      )}
      {item.kind === 'crisis' && (
        <Action secondary onPress={() => router.push('/support')}>
          Need support now?
        </Action>
      )}
      {activity && (
        <Action
          secondary
          icon={activities[activity].icon}
          onPress={() => openActivity(activity, conversationId)}
        >
          {activities[activity].label}
        </Action>
      )}
    </ChatBubble>
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
  const [focused, setFocused] = useState(false);
  const entranceKeys = useRef(new Set<string>());
  const claimEntrance = useCallback((key: string) => entranceKeys.current.delete(key), []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        entranceKeys.current.clear();
      };
    }, []),
  );
  const motionActive = active && focused;
  useEffect(() => {
    if (!active) entranceKeys.current.clear();
  }, [active]);
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
  const awaitingReply =
    send.isPending &&
    !items.some(
      (item) =>
        item.role === 'assistant' &&
        item.requestId === send.variables?.requestId &&
        item.status === 'complete',
    );
  const outgoing =
    pending &&
    !pendingComplete &&
    !items.some((item) => item.role === 'user' && item.requestId === pending.requestId)
      ? pending
      : null;
  const displayedItems = useMemo(() => {
    const visible =
      awaitingReply && pending
        ? items.filter(
            (item) =>
              !(
                item.role === 'assistant' &&
                item.requestId === pending.requestId &&
                item.status !== 'complete'
              ),
          )
        : items;
    if (!outgoing) return visible;
    return [
      ...visible,
      {
        id: `pending-${outgoing.requestId}`,
        conversationId: id,
        requestId: outgoing.requestId,
        sequence: (items.at(-1)?.sequence ?? 0) + 1,
        role: 'user' as const,
        content: outgoing.content,
        status: 'pending' as const,
        kind: 'normal' as const,
        createdAt: '',
      },
    ];
  }, [awaitingReply, id, items, outgoing, pending]);
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
  const showActivities =
    last?.role === 'assistant' &&
    last.kind === 'normal' &&
    last.status === 'complete' &&
    !send.isPending &&
    !retryInput;
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
    entranceKeys.current.clear();
    if (!items.some((item) => item.role === 'user' && item.requestId === value.requestId))
      entranceKeys.current.add(`${value.requestId}-user-pending`);
    entranceKeys.current.add(`${value.requestId}-assistant-complete`);
    draftState.update({ pending: value, text: value.content });
    followReply.current = true;
    setError(null);
    try {
      const result = await send.mutateAsync(value);
      draftState.update({ text: '', pending: null, origin: null });
      if (result.assistantMessage.status === 'failed')
        setError('Sol couldn’t reply. Your message is saved; you can retry it below.');
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
              state={awaitingReply ? 'thinking' : 'idle'}
              mood={2}
              size={tokens.sol.mini}
              active={motionActive && awaitingReply}
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
          {showActivities && (
            <IconButton
              icon="wind"
              label="Take a breathing break"
              onPress={() => openActivity('breathing', id)}
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
          data={displayedItems}
          extraData={`${showActivities}-${motionActive}-${awaitingReply}`}
          keyExtractor={(item) => `${item.requestId}-${item.role}`}
          renderItem={({ item }) => (
            <Message
              item={item}
              showActivities={showActivities}
              conversationId={id}
              motionActive={motionActive}
              claimEntrance={claimEntrance}
              delivery={
                item.role === 'user' && item.id.startsWith('pending-')
                  ? awaitingReply
                    ? 'sending'
                    : 'unconfirmed'
                  : undefined
              }
            />
          )}
          contentContainerStyle={[
            styles.messages,
            displayedItems.length === 0 && styles.emptyMessages,
          ]}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScrollBeginDrag={() => {
            followReply.current = false;
            entranceKeys.current.clear();
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
            const latest = displayedItems.at(-1);
            const key = latest ? `${latest.id}-${latest.status}-${awaitingReply}` : null;
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
          ListFooterComponent={
            awaitingReply ? <ThinkingBubble motionActive={motionActive} /> : undefined
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
                      ? 'Talk about your check-in.'
                      : 'What’s on your mind?'}
              </AppText>
              {!query.isPending && !query.isError && (
                <AppText variant="bodySmall" tone="secondary" style={styles.centeredText}>
                  {origin
                    ? 'Edit the message below, then tap Send when you’re ready.'
                    : 'Tell Sol what happened today.'}
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
                  value={send.isPending ? '' : draft}
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
