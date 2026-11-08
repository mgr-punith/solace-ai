import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { affirmationForDay } from '@solace/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { AffirmationsScreen } from '../AffirmationsScreen';
import { wellnessApi } from '../api';
import { router } from 'expo-router';
let mockConversation: string | undefined;
jest.mock('../api', () => ({
  wellnessApi: { save: jest.fn(), favorites: jest.fn(), favorite: jest.fn() },
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ conversation: mockConversation }),
  router: { replace: jest.fn(), navigate: jest.fn(), canGoBack: () => false },
}));
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
beforeEach(() => {
  mockConversation = undefined;
  jest.mocked(wellnessApi.favorites).mockResolvedValue({ items: [] });
  jest
    .mocked(wellnessApi.save)
    .mockResolvedValue({ id: 'a', type: 'affirmation', completedAt: '2026-11-07T12:00:00Z' });
  jest.mocked(wellnessApi.favorite).mockResolvedValue(undefined);
});

it('returns to the originating conversation without marking a read or sending a reflection', async () => {
  mockConversation = '550e8400-e29b-41d4-a716-446655440000';
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to conversation' }));
  expect(router.navigate).toHaveBeenCalledWith({
    pathname: '/chat/[id]',
    params: { id: mockConversation },
  });
  expect(wellnessApi.save).not.toHaveBeenCalled();
});

it('ignores untrusted conversation parameters', async () => {
  mockConversation = 'https://example.invalid';
  await mount();
  expect(screen.queryByRole('button', { name: 'Back to conversation' })).toBeNull();
});
afterEach(() => {
  jest.useRealTimers();
});
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
        <AffirmationsScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
it('only records an explicit read and reuses the request after a failed save', async () => {
  jest.mocked(wellnessApi.save).mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(wellnessApi.save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  const input = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry marking as read' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Added to today’s progress' })).toBeTruthy(),
  );
  expect(jest.mocked(wellnessApi.save).mock.calls[1]?.[1]).toEqual(input);
});
it('shows an honest favorites error, retries it, and allows account favorite creation', async () => {
  jest.mocked(wellnessApi.favorites).mockRejectedValueOnce(new Error('offline'));
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Saved words' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.queryByText('No saved affirmations yet.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Reload saved words' }));
  await waitFor(() => expect(screen.getByText('No saved affirmations yet.')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save to favorites' }));
  await waitFor(() =>
    expect(wellnessApi.favorite).toHaveBeenCalledWith('token', expect.any(String), true),
  );
  expect(wellnessApi.save).not.toHaveBeenCalled();
});
it('keeps an earlier affirmation visible when its failed save is retried after midnight', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T23:59:30'));
  jest.mocked(wellnessApi.save).mockRejectedValueOnce(new Error('offline'));
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Mark as read' }));
  await act(async () => jest.advanceTimersByTime(0));
  const original = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(screen.getByText(affirmationForDay('2026-11-07').text)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry marking as read' }));
  await act(async () => jest.advanceTimersByTime(0));
  expect(jest.mocked(wellnessApi.save).mock.calls[1]?.[1]).toEqual(original);
  expect(screen.getByText(affirmationForDay('2026-11-08').text)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeTruthy();
});
