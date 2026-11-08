jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
}));
import { beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { FlatList } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { ChatScreen } from '../ChatScreen';
import { chatApi } from '../api';
import { providerInfoApi } from '../provider-info';
import type { ChatMessage } from '@solace/shared';
import { chatDraftKey, seedChatDraft } from '../drafts';

jest.mock('../api', () => ({ chatApi: { messages: jest.fn(), send: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
const user: ChatMessage = {
  id: 'user',
  conversationId: 'conversation',
  requestId: 'request-id-for-test',
  sequence: 1,
  role: 'user',
  content: 'A hard day',
  status: 'complete',
  kind: 'normal',
  createdAt: '2026-11-06T12:00:00Z',
};
const assistant: ChatMessage = {
  ...user,
  id: 'assistant',
  role: 'assistant',
  sequence: 2,
  content: 'I hear you.',
};
async function mount(
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  }),
) {
  const view = await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ChatScreen id="conversation" />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { view, client };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(chatApi.send).mockReset();
  jest.spyOn(providerInfoApi, 'get').mockResolvedValue({ provider: 'groq' });
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [], nextCursor: null });
});
it('shows the outgoing message immediately and replaces thinking with one saved reply', async () => {
  let finish: ((value: Awaited<ReturnType<typeof chatApi.send>>) => void) | undefined;
  jest.mocked(chatApi.send).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), user.content);
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(chatApi.send).toHaveBeenCalledTimes(1));
  expect(screen.getAllByText(user.content)).toHaveLength(1);
  expect(screen.getByText('Sending…')).toBeTruthy();
  expect(screen.getByLabelText('Sol is thinking…')).toBeTruthy();
  expect(screen.getByLabelText('Message Sol').props.value).toBe('');
  expect(screen.queryByRole('button', { name: 'Talk through my day' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  expect(chatApi.send).toHaveBeenCalledTimes(1);

  const requestId = jest.mocked(chatApi.send).mock.calls[0]![2].requestId;
  const savedUser = { ...user, requestId };
  const savedReply = { ...assistant, requestId };
  // A slow history refresh must not make a confirmed reply disappear.
  let refresh: ((value: Awaited<ReturnType<typeof chatApi.messages>>) => void) | undefined;
  jest.mocked(chatApi.messages).mockImplementation(
    () =>
      new Promise((resolve) => {
        refresh = resolve;
      }),
  );
  await act(async () => finish?.({ userMessage: savedUser, assistantMessage: savedReply }));
  await waitFor(() => expect(screen.getByText(savedReply.content)).toBeTruthy());
  expect(screen.getAllByText(user.content)).toHaveLength(1);
  expect(screen.queryByLabelText('Sol is thinking…')).toBeNull();
  expect(screen.queryByText('Sending…')).toBeNull();
  await act(async () => refresh?.({ items: [savedReply, savedUser], nextCursor: null }));
});

it('stops thinking after an unconfirmed send and keeps the original draft for retry', async () => {
  let fail: ((reason: Error) => void) | undefined;
  jest.mocked(chatApi.send).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), user.content);
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByLabelText('Sol is thinking…')).toBeTruthy());
  await act(async () => fail?.(new Error('Offline')));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry message' })).toBeTruthy());
  expect(screen.queryByLabelText('Sol is thinking…')).toBeNull();
  expect(screen.getByText('Not confirmed · retry below')).toBeTruthy();
  expect(screen.getByLabelText('Message Sol').props.value).toBe(user.content);
  expect(screen.getAllByText(user.content)).toHaveLength(1);
});

it('keeps one saved user bubble and hides the old fallback while retrying its reply', async () => {
  jest.mocked(chatApi.messages).mockResolvedValue({
    items: [{ ...assistant, kind: 'fallback', status: 'failed' }, user],
    nextCursor: null,
  });
  let finish: ((value: Awaited<ReturnType<typeof chatApi.send>>) => void) | undefined;
  jest.mocked(chatApi.send).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry message' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Retry message' }));
  await waitFor(() => expect(screen.getByLabelText('Sol is thinking…')).toBeTruthy());
  expect(screen.getAllByText(user.content)).toHaveLength(1);
  expect(screen.queryByText(assistant.content)).toBeNull();
  expect(screen.queryByText('Sending…')).toBeNull();
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [assistant, user], nextCursor: null });
  await act(async () => finish?.({ userMessage: user, assistantMessage: assistant }));
  await waitFor(() => expect(screen.queryByLabelText('Sol is thinking…')).toBeNull());
  expect(screen.getAllByText(user.content)).toHaveLength(1);
  expect(screen.getByText(assistant.content)).toBeTruthy();
});

it('preserves a failed send and retries the same content and request ID', async () => {
  jest
    .mocked(chatApi.send)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue({ userMessage: user, assistantMessage: assistant });
  await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), user.content);
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());
  const first = jest.mocked(chatApi.send).mock.calls[0]?.[2];
  expect(first?.content).toBe(user.content);
  expect(screen.getByLabelText('Message Sol').props.value).toBe(user.content);
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [assistant, user], nextCursor: null });
  await fireEvent.press(screen.getByRole('button', { name: 'Retry message' }));
  await waitFor(() => expect(screen.getByText('I hear you.')).toBeTruthy());
  expect(jest.mocked(chatApi.send).mock.calls[1]?.[2]).toEqual(first);
});
it('restores the retry action for a saved failed turn and shows support on crisis replies', async () => {
  jest.mocked(chatApi.messages).mockResolvedValue({
    items: [{ ...assistant, kind: 'fallback', status: 'failed' }, user],
    nextCursor: null,
  });
  jest
    .mocked(chatApi.send)
    .mockResolvedValue({ userMessage: user, assistantMessage: { ...assistant, kind: 'crisis' } });
  await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry message' })).toBeTruthy());
  jest
    .mocked(chatApi.messages)
    .mockResolvedValue({ items: [{ ...assistant, kind: 'crisis' }, user], nextCursor: null });
  await fireEvent.press(screen.getByRole('button', { name: 'Retry message' }));
  await waitFor(() =>
    expect(screen.getAllByRole('button', { name: 'Need support now?' })).toHaveLength(2),
  );
  expect(chatApi.send).toHaveBeenCalledWith('token', 'conversation', {
    requestId: user.requestId,
    content: user.content,
  });
  expect(screen.queryByRole('button', { name: 'Take a breathing break' })).toBeNull();
});

it('lets the user edit a check-in handoff and sends only their reviewed text', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  seedChatDraft(client, 'a', 'conversation', {
    text: 'A private note',
    origin: 'checkin',
    pending: null,
  });
  jest.mocked(chatApi.send).mockResolvedValue({ userMessage: user, assistantMessage: assistant });
  await mount(client);
  await waitFor(() =>
    expect(screen.getByLabelText('Message Sol').props.value).toBe('A private note'),
  );
  expect(chatApi.send).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'Just feeling tired.');
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() =>
    expect(chatApi.send).toHaveBeenCalledWith(
      'token',
      'conversation',
      expect.objectContaining({ content: 'Just feeling tired.' }),
    ),
  );
  expect(client.getQueryData(chatDraftKey('a', 'conversation'))).toMatchObject({
    text: '',
    origin: null,
    pending: null,
  });
});

it('prepares starter prompts without sending anything', async () => {
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Talk through my day' })).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Talk through my day' }));
  expect(screen.getByLabelText('Message Sol').props.value).toBe('I’d like to talk through my day.');
  expect(chatApi.send).not.toHaveBeenCalled();
});

it('keeps an unsent draft through a breathing break and reopening the conversation', async () => {
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [assistant, user], nextCursor: null });
  const { client, view } = await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'Keep this thought');
  await fireEvent.press(screen.getByRole('button', { name: 'Take a breathing break' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/breathing',
    params: { conversation: 'conversation' },
  });
  expect(chatApi.send).not.toHaveBeenCalled();
  await view.unmount();
  await mount(client);
  await waitFor(() =>
    expect(screen.getByLabelText('Message Sol').props.value).toBe('Keep this thought'),
  );
});

it('retains the original retry key after leaving an unconfirmed send', async () => {
  jest.mocked(chatApi.send).mockRejectedValue(new Error('Offline'));
  const { client, view } = await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'Keep this retry');
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());
  const original = jest.mocked(chatApi.send).mock.calls[0]?.[2];
  await view.unmount();
  await mount(client);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Retry message' }).props.accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Retry message' }));
  await waitFor(() => expect(chatApi.send).toHaveBeenCalledTimes(2));
  expect(jest.mocked(chatApi.send).mock.calls[1]?.[2]).toEqual(original);
});

it('keeps the reading position when a new reply arrives and offers a jump to latest', async () => {
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [assistant, user], nextCursor: null });
  const { client } = await mount();
  await waitFor(() => expect(screen.getByText('I hear you.')).toBeTruthy());
  const scroll = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => {});
  await fireEvent(screen.getByTestId('chat-messages'), 'contentSizeChange', 350, 1800);
  scroll.mockClear();
  await fireEvent(screen.getByTestId('chat-messages'), 'scrollBeginDrag');
  await fireEvent.scroll(screen.getByTestId('chat-messages'), {
    nativeEvent: {
      contentOffset: { y: 100 },
      contentSize: { height: 1800 },
      layoutMeasurement: { height: 600 },
    },
  });
  await act(async () => {
    client.setQueryData(['chat', 'a', 'conversation'], {
      pages: [
        {
          items: [
            {
              ...assistant,
              id: 'reply-2',
              requestId: 'second-request-for-test',
              sequence: 4,
              content: 'A new reply.',
            },
            assistant,
            user,
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });
  });
  await waitFor(() => expect(screen.getByText('A new reply.')).toBeTruthy());
  await fireEvent(screen.getByTestId('chat-messages'), 'contentSizeChange', 350, 2000);
  expect(scroll).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Latest messages' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Latest messages' }));
  expect(scroll).toHaveBeenCalled();
  scroll.mockRestore();
});
it('offers recovery instead of an empty chat when loading fails', async () => {
  jest
    .mocked(chatApi.messages)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ items: [], nextCursor: null });
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Reload conversation' })).toBeTruthy(),
  );
  expect(screen.queryByLabelText('Message Sol')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Reload conversation' }));
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
});

it('shows the deployed provider and blocks sending until its privacy details load', async () => {
  jest.mocked(providerInfoApi.get).mockRejectedValueOnce(new Error('offline'));
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Reload chat details' })).toBeTruthy(),
  );
  // Message history and provider details finish independently.
  const composer = await screen.findByLabelText('Message Sol');
  await fireEvent.changeText(composer, 'Hello');
  expect(
    screen.getByRole('button', { name: 'Send message' }).props.accessibilityState.disabled,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  expect(chatApi.send).not.toHaveBeenCalled();
  jest.mocked(providerInfoApi.get).mockResolvedValue({ provider: 'vyceai' });
  await fireEvent.press(screen.getByRole('button', { name: 'Reload chat details' }));
  await waitFor(() => expect(screen.getByText(/sent to VyceAi for replies/)).toBeTruthy());
  expect(
    screen.getByRole('button', { name: 'Send message' }).props.accessibilityState.disabled,
  ).toBe(false);
});

it.each([
  ['breathing', 'Breathe for a minute', '/breathing'],
  ['affirmation', 'Read today’s words', '/affirmations'],
] as const)(
  'opens a persisted %s suggestion and preserves the unsent draft',
  async (activity, label, pathname) => {
    jest.mocked(chatApi.messages).mockResolvedValue({
      items: [{ ...assistant, activity }, user],
      nextCursor: null,
    });
    const { client, view } = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: label })).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'Keep this thought');
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(router.push).toHaveBeenCalledWith({
      pathname,
      params: { conversation: 'conversation' },
    });
    expect(chatApi.send).not.toHaveBeenCalled();
    await view.unmount();
    await mount(client);
    await waitFor(() =>
      expect(screen.getByLabelText('Message Sol').props.value).toBe('Keep this thought'),
    );
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  },
);

it.each([
  { kind: 'crisis' as const, status: 'complete' as const },
  { kind: 'fallback' as const, status: 'failed' as const },
  { kind: 'normal' as const, status: 'pending' as const },
])('hides all activity invitations when the latest reply is $kind/$status', async (state) => {
  jest.mocked(chatApi.messages).mockResolvedValue({
    items: [
      {
        ...assistant,
        id: 'latest',
        requestId: 'second-request-for-test',
        sequence: 4,
        activity: 'affirmation',
        ...state,
      },
      {
        ...user,
        id: 'next',
        requestId: 'second-request-for-test',
        sequence: 3,
        activity: 'breathing',
      },
      { ...assistant, activity: 'breathing' },
      user,
    ],
    nextCursor: null,
  });
  await mount();
  await waitFor(() => expect(screen.getByLabelText('Message Sol')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Breathe for a minute' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Read today’s words' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Take a breathing break' })).toBeNull();
});

it('hides old activity invitations while a send is pending or unconfirmed', async () => {
  jest.mocked(chatApi.messages).mockResolvedValue({
    items: [{ ...assistant, activity: 'breathing' }, user],
    nextCursor: null,
  });
  let rejectSend: ((error: Error) => void) | undefined;
  jest.mocked(chatApi.send).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSend = reject;
      }),
  );
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Breathe for a minute' })).toBeTruthy(),
  );
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'I need help now.');
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(chatApi.send).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Breathe for a minute' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Take a breathing break' })).toBeNull();
  await act(async () => rejectSend?.(new Error('Offline')));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry message' })).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Breathe for a minute' })).toBeNull();
});
