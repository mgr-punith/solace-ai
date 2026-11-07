import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { HistoryScreen } from '../HistoryScreen';
import { moodApi } from '../api';
import type { MoodCheckin } from '@solace/shared';

jest.mock('../../progress/ProgressSummary', () => ({ ProgressSummary: () => null }));
jest.mock('../api', () => ({ moodApi: { list: jest.fn(), remove: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('test-token'),
  }),
}));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
const entry: MoodCheckin = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  mood: 2,
  tags: ['Tired'],
  note: 'A long day',
  timezone: 'UTC',
  createdAt: '2026-11-06T12:00:00Z',
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
        <HistoryScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
it('shows saved entries and requires confirmation before deleting their content', async () => {
  jest.mocked(moodApi.list).mockResolvedValue({ items: [entry], nextCursor: null });
  jest.mocked(moodApi.remove).mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount();
  await waitFor(() => expect(screen.getByText('A long day')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: /Delete Low check-in/ }));
  expect(moodApi.remove).not.toHaveBeenCalled();
  jest.mocked(moodApi.list).mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => {
    alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Delete check-in')?.onPress?.();
  });
  await waitFor(() => expect(screen.queryByText('A long day')).toBeNull());
  expect(moodApi.remove).toHaveBeenCalledWith('test-token', entry.id);
  expect(screen.getByText('Your first check-in can be today.')).toBeTruthy();
  alert.mockRestore();
});
it('offers recovery after a list failure and does not mislabel the failure as an empty history', async () => {
  jest
    .mocked(moodApi.list)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ items: [], nextCursor: null });
  await mount();
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.queryByText('Your first check-in can be today.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Try loading again' }));
  await waitFor(() => expect(screen.getByText('Your first check-in can be today.')).toBeTruthy());
});
