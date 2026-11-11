import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MoodCheckin } from '@solace/shared';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { CheckinArchiveScreen } from '../CheckinArchiveScreen';
import { moodApi } from '../api';

jest.mock('../api', () => ({ moodApi: { list: jest.fn(), remove: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('test-token'),
  }),
}));
jest.mock('../../../lib/useScreenBack', () => ({ useScreenBack: () => jest.fn() }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));

const entry = (id: string, note: string): MoodCheckin => ({
  id,
  mood: 3,
  tags: ['Calm'],
  note,
  timezone: 'UTC',
  createdAt: '2026-11-12T08:00:00Z',
});

beforeEach(() => {
  jest.clearAllMocks();
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
        <CheckinArchiveScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

it('loads the archive in cursor pages instead of growing the Progress screen', async () => {
  jest
    .mocked(moodApi.list)
    .mockResolvedValueOnce({ items: [entry('new', 'Newest')], nextCursor: 'older' })
    .mockResolvedValueOnce({ items: [entry('old', 'Older')], nextCursor: null });
  await mount();
  expect(await screen.findByText('Newest')).toBeTruthy();
  expect(screen.queryByText('Older')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Load earlier' }));
  await waitFor(() => expect(screen.getByText('Older')).toBeTruthy());
  expect(moodApi.list).toHaveBeenNthCalledWith(1, 'test-token', {
    cursor: undefined,
    limit: 10,
  });
  expect(moodApi.list).toHaveBeenNthCalledWith(2, 'test-token', {
    cursor: 'older',
    limit: 10,
  });
  expect(screen.queryByRole('button', { name: 'Load earlier' })).toBeNull();
});
