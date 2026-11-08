import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { HomeScreen } from '../HomeScreen';
import { moodApi } from '../../mood/api';
import { chatApi } from '../../chat/api';
import { chatDraftKey } from '../../chat/drafts';
import { localDay, type MoodCheckin } from '@solace/shared';
import { wellnessApi } from '../../wellness/api';

jest.mock('../../mood/api', () => ({ moodApi: { list: jest.fn(), save: jest.fn() } }));
jest.mock('../../chat/api', () => ({ chatApi: { create: jest.fn(), send: jest.fn() } }));
jest.mock('../../wellness/api', () => ({ wellnessApi: { daily: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a', name: 'MAYA' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: jest.fn(), navigate: jest.fn() },
}));
const entry: MoodCheckin = {
  id: 'entry',
  mood: 2,
  tags: ['Tired'],
  note: 'Synthetic check-in',
  timezone: 'UTC',
  createdAt: new Date().toISOString(),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(moodApi.list).mockResolvedValue({ items: [entry], nextCursor: null });
  jest.mocked(wellnessApi.daily).mockImplementation(async (_token, timezone) => ({
    day: localDay(new Date(), timezone),
    timezone,
    checkedIn: true,
    breathingSessions: 0,
    readAffirmationIds: [],
  }));
  jest.mocked(chatApi.create).mockResolvedValue({
    id: 'thread',
    title: 'Conversation with Sol',
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
  });
});
async function mount() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <HomeScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return client;
}
it('shows a saved daily state on return and opens an editable chat draft without sending it', async () => {
  const client = await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Talk about this' })).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Save check-in' })).toBeNull();
  expect(screen.getAllByText('Synthetic check-in')).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Talk about this' }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({ pathname: '/chat/[id]', params: { id: 'thread' } }),
  );
  expect(client.getQueryData(chatDraftKey('a', 'thread'))).toMatchObject({
    origin: 'checkin',
    text: expect.stringContaining('Synthetic check-in'),
  });
  expect(chatApi.send).not.toHaveBeenCalled();
});
it('allows another check-in explicitly and keeps the previous one when cancelled', async () => {
  await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Check in again' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Check in again' }));
  expect(screen.getByRole('button', { name: 'Save check-in' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel check-in' }));
  expect(screen.getByText('Synthetic check-in')).toBeTruthy();
  expect(moodApi.save).not.toHaveBeenCalled();
});
it('shows a recoverable loading failure rather than pretending there is no saved mood', async () => {
  jest.mocked(moodApi.list).mockRejectedValue(new Error('offline'));
  await mount();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Try loading again' })).toBeTruthy(),
  );
  expect(screen.queryByRole('button', { name: 'Save check-in' })).toBeNull();
});

it('shows the newly saved mood immediately and reflects deletion after refreshing', async () => {
  jest.mocked(moodApi.list).mockResolvedValue({ items: [], nextCursor: null });
  jest.mocked(moodApi.save).mockImplementation(async () => {
    jest.mocked(moodApi.list).mockResolvedValue({ items: [entry], nextCursor: null });
    return entry;
  });
  const client = await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Low, 2 of 5' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Low, 2 of 5' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Talk about this' })).toBeTruthy());
  jest.mocked(moodApi.list).mockResolvedValue({ items: [], nextCursor: null });
  await client.invalidateQueries({ queryKey: ['mood', 'a'] });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save check-in' })).toBeTruthy());
  expect(screen.queryByText('Synthetic check-in')).toBeNull();
});

it('retries the same chat handoff after a lost creation response', async () => {
  jest.mocked(chatApi.create).mockRejectedValueOnce(new Error('offline'));
  const client = await mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Talk about this' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Talk about this' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Retry opening chat' })).toBeTruthy(),
  );
  const retry = jest.mocked(chatApi.create).mock.calls[0]?.[1];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry opening chat' }));
  await waitFor(() => expect(router.push).toHaveBeenCalled());
  expect(jest.mocked(chatApi.create).mock.calls[1]?.[1]).toBe(retry);
  expect(client.getQueryData(chatDraftKey('a', 'thread'))).toMatchObject({
    text: expect.stringContaining(entry.note),
  });
  expect(chatApi.send).not.toHaveBeenCalled();
});
it('offers a recommendation based on selected tags and keeps all alternatives available', async () => {
  await mount();
  expect(
    await screen.findByText(
      'You chose Tired in your check-in. Reading a few words takes little effort.',
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Read today’s words' }));
  expect(router.push).toHaveBeenCalledWith('/affirmations');
  await fireEvent.press(screen.getByRole('button', { name: 'Other ideas' }));
  expect(screen.getByRole('button', { name: 'Breathe for a minute' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Reflect with Sol' })).toBeTruthy();
});
it('opens a reflection as a draft without sharing private check-in content or sending it', async () => {
  jest
    .mocked(moodApi.list)
    .mockResolvedValue({ items: [{ ...entry, mood: 4, tags: ['Grateful'] }], nextCursor: null });
  const client = await mount();
  await fireEvent.press(await screen.findByRole('button', { name: 'Reflect with Sol' }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({ pathname: '/chat/[id]', params: { id: 'thread' } }),
  );
  expect(client.getQueryData(chatDraftKey('a', 'thread'))).toMatchObject({
    text: 'One part of today I’d like to remember is…',
    pending: null,
  });
  expect(chatApi.send).not.toHaveBeenCalled();
});
it('keeps daily progress at two stops and moves a completed suggestion behind other choices', async () => {
  jest.mocked(wellnessApi.daily).mockImplementation(async (_token, timezone) => ({
    day: localDay(new Date(), timezone),
    timezone,
    checkedIn: true,
    breathingSessions: 8,
    readAffirmationIds: [],
  }));
  await mount();
  expect(await screen.findByText('Both moments saved. Come back when you want to.')).toBeTruthy();
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(2);
  expect(screen.queryByRole('button', { name: 'Read today’s words' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'More ideas for today' }));
  expect(screen.getByRole('button', { name: 'Read today’s words' })).toBeTruthy();
});
it('offers a recoverable daily failure with access to existing practices', async () => {
  jest.mocked(wellnessApi.daily).mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(await screen.findByRole('button', { name: 'Open Wellness' })).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Reload suggestions' }));
  expect(await screen.findByRole('progressbar')).toBeTruthy();
});
