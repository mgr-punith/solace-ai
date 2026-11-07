jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { canGoBack: () => false, replace: jest.fn() },
}));
import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { ChatScreen } from '../ChatScreen';
import { chatApi } from '../api';
import { providerInfoApi } from '../provider-info';
import type { ChatMessage } from '@solace/shared';

jest.mock('../api', () => ({ chatApi: { messages: jest.fn(), send: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
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
async function mount() {
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false, gcTime: 0 },
          },
        })
      }
    >
      <ThemeProvider>
        <ChatScreen id="conversation" />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(providerInfoApi, 'get').mockResolvedValue({ provider: 'groq' });
  jest.mocked(chatApi.messages).mockResolvedValue({ items: [], nextCursor: null });
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
  await fireEvent.changeText(screen.getByLabelText('Message Sol'), 'Hello');
  await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
  expect(chatApi.send).not.toHaveBeenCalled();
  jest.mocked(providerInfoApi.get).mockResolvedValue({ provider: 'vyceai' });
  await fireEvent.press(screen.getByRole('button', { name: 'Reload chat details' }));
  await waitFor(() => expect(screen.getByText(/sent to VyceAi for replies/)).toBeTruthy());
  expect(
    screen.getByRole('button', { name: 'Send message' }).props.accessibilityState.disabled,
  ).toBe(false);
});
