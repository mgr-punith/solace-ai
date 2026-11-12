import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Conversation } from '@solace/shared';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { ConversationArchiveScreen } from '../ConversationArchiveScreen';
import { chatApi } from '../api';

jest.mock('../api', () => ({ chatApi: { list: jest.fn(), remove: jest.fn() } }));
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

const entry = (id: string, title: string): Conversation => ({
  id,
  title,
  createdAt: '2026-11-12T08:00:00Z',
  updatedAt: '2026-11-12T08:00:00Z',
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
        <ConversationArchiveScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

it('loads conversations in cursor pages instead of growing the Talk screen', async () => {
  jest
    .mocked(chatApi.list)
    .mockResolvedValueOnce({ items: [entry('new', 'Newest chat')], nextCursor: 'older' })
    .mockResolvedValueOnce({ items: [entry('old', 'Older chat')], nextCursor: null });
  await mount();
  expect(await screen.findByText('Newest chat')).toBeTruthy();
  expect(screen.queryByText('Older chat')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Load earlier' }));
  await waitFor(() => expect(screen.getByText('Older chat')).toBeTruthy());
  expect(chatApi.list).toHaveBeenNthCalledWith(1, 'test-token', undefined);
  expect(chatApi.list).toHaveBeenNthCalledWith(2, 'test-token', 'older');
  expect(screen.queryByRole('button', { name: 'Load earlier' })).toBeNull();
});
