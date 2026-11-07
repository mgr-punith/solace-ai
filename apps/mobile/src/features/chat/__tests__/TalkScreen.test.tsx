import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { TalkScreen } from '../TalkScreen';
import { chatApi } from '../api';
import { providerInfoApi } from '../provider-info';
const conversation = {
  id: 'conversation',
  title: 'Conversation with Sol',
  createdAt: '2026-11-06T12:00:00Z',
  updatedAt: '2026-11-06T12:00:00Z',
};
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
jest.mock('../api', () => ({ chatApi: { list: jest.fn(), create: jest.fn(), remove: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
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
        <TalkScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(providerInfoApi, 'get').mockResolvedValue({ provider: 'groq' });
  jest.mocked(chatApi.list).mockResolvedValue({ items: [conversation], nextCursor: null });
});
it('opens existing conversations and retries creation with the same ID after a lost response', async () => {
  jest
    .mocked(chatApi.create)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(conversation);
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Continue conversation' })).toBeTruthy(),
  );
  expect(screen.getByText(/sent to Groq for replies/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue conversation' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/chat/[id]',
    params: { id: conversation.id },
  });
  await fireEvent.press(screen.getByRole('button', { name: 'New conversation' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Retry new conversation' })).toBeTruthy(),
  );
  const first = jest.mocked(chatApi.create).mock.calls[0]?.[1];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry new conversation' }));
  await waitFor(() => expect(chatApi.create).toHaveBeenCalledTimes(2));
  expect(jest.mocked(chatApi.create).mock.calls[1]?.[1]).toBe(first);
});
it('requires confirmation before deleting all messages in a conversation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(chatApi.remove).mockResolvedValue(undefined);
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Delete conversation' })).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Delete conversation' }));
  expect(chatApi.remove).not.toHaveBeenCalled();
  jest.mocked(chatApi.list).mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => {
    alert.mock.calls[0]?.[2]?.find((button) => button.text === 'Delete conversation')?.onPress?.();
  });
  await waitFor(() =>
    expect(screen.getByText('Your first conversation can start anywhere.')).toBeTruthy(),
  );
  expect(chatApi.remove).toHaveBeenCalledWith('token', conversation.id);
  alert.mockRestore();
});
