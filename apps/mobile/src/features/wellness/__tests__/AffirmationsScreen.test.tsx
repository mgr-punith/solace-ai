import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { affirmationForDay, localDay } from '@solace/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { AffirmationsScreen } from '../AffirmationsScreen';
import { wellnessApi } from '../api';
import { router } from 'expo-router';
let mockConversation: string | undefined;
let mockUserId = 'a';
jest.mock('../api', () => ({
  wellnessApi: { save: jest.fn(), favorites: jest.fn(), favorite: jest.fn(), daily: jest.fn() },
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ conversation: mockConversation }),
  router: { replace: jest.fn(), navigate: jest.fn(), canGoBack: () => false },
}));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: mockUserId } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
beforeEach(() => {
  mockUserId = 'a';
  mockConversation = undefined;
  jest.mocked(wellnessApi.favorites).mockResolvedValue({ items: [] });
  jest.mocked(wellnessApi.save).mockImplementation(async () => ({
    id: 'a',
    type: 'affirmation',
    completedAt: new Date().toISOString(),
  }));
  jest.mocked(wellnessApi.favorite).mockResolvedValue(undefined);
  jest.mocked(wellnessApi.daily).mockImplementation(async (_token, timezone) => ({
    day: localDay(new Date(), timezone),
    timezone,
    checkedIn: false,
    breathingSessions: 0,
    readAffirmationIds: [],
  }));
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
  return render(
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
  await fireEvent.press(await screen.findByRole('button', { name: 'I’ve read this' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  const input = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving read' }));
  await waitFor(() => expect(screen.getByText('Read today')).toBeTruthy());
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
  await act(async () => jest.advanceTimersByTime(0));
  await fireEvent.press(screen.getByRole('button', { name: 'I’ve read this' }));
  await act(async () => jest.advanceTimersByTime(0));
  const original = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(screen.getByText(affirmationForDay('2026-11-07').text)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving read' }));
  await act(async () => jest.advanceTimersByTime(0));
  expect(jest.mocked(wellnessApi.save).mock.calls[1]?.[1]).toEqual(original);
  expect(screen.getByText(affirmationForDay('2026-11-08').text)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'I’ve read this' })).toBeTruthy();
});
it('shows read status from the account on reopen and never logs a second read', async () => {
  jest.mocked(wellnessApi.daily).mockImplementation(async (_token, timezone) => {
    const day = localDay(new Date(), timezone);
    return {
      day,
      timezone,
      checkedIn: false,
      breathingSessions: 0,
      readAffirmationIds: [affirmationForDay(day).id],
    };
  });
  await mount();
  expect(await screen.findByText('Read today')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'I’ve read this' })).toBeNull();
  expect(wellnessApi.save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save to favorites' })).toBeTruthy();
});
it('keeps status loading and failure distinct from an unread affirmation', async () => {
  jest.mocked(wellnessApi.daily).mockRejectedValueOnce(new Error('offline'));
  await mount();
  await fireEvent.press(await screen.findByRole('button', { name: 'Reload read status' }));
  expect(await screen.findByRole('button', { name: 'I’ve read this' })).toBeTruthy();
  expect(wellnessApi.save).not.toHaveBeenCalled();
});
it('reuses a lost read request after the screen reopens and blocks repeated taps', async () => {
  jest.mocked(wellnessApi.save).mockRejectedValueOnce(new Error('response lost'));
  const first = await mount();
  await fireEvent.press(await screen.findByRole('button', { name: 'I’ve read this' }));
  await screen.findByRole('button', { name: 'Retry saving read' });
  const input = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  await first.unmount();
  await mount();
  const read = await screen.findByRole('button', { name: 'I’ve read this' });
  await fireEvent.press(read);
  await fireEvent.press(read);
  await screen.findByText('Read today');
  expect(wellnessApi.save).toHaveBeenCalledTimes(2);
  expect(jest.mocked(wellnessApi.save).mock.calls[1]?.[1]).toEqual(input);
});
it('does not carry a successful read into another account', async () => {
  const first = await mount();
  await fireEvent.press(await screen.findByRole('button', { name: 'I’ve read this' }));
  await screen.findByText('Read today');
  await first.unmount();
  mockUserId = 'b';
  await mount();
  expect(await screen.findByRole('button', { name: 'I’ve read this' })).toBeTruthy();
  expect(screen.queryByText('Read today')).toBeNull();
});
