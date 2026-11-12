import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { BreathingScreen } from '../BreathingScreen';
import { wellnessApi } from '../../wellness/api';
import { router } from 'expo-router';
import { chatDraftKey } from '../../chat/drafts';
let mockConversation: string | undefined;
jest.mock('../../wellness/api', () => ({ wellnessApi: { save: jest.fn() } }));
jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  usePreventRemove: jest.fn(),
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
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
let background: ((state: AppStateStatus) => void) | undefined;
beforeEach(() => {
  mockConversation = undefined;
  jest.useFakeTimers();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    if (event === 'change') background = listener;
    return { remove: jest.fn() };
  });
  AppState.currentState = 'active';
  jest
    .mocked(wellnessApi.save)
    .mockResolvedValue({ id: 'activity', type: 'breathing', completedAt: '2026-11-07T12:00:00Z' });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function mount(
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  }),
) {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <BreathingScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}
it('pauses on background, excludes background time and saves only after completion with safe retry', async () => {
  jest.mocked(wellnessApi.save).mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(screen.queryByRole('button', { name: 'Save session' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start breathing' }));
  await advance(10000);
  await act(async () => {
    background?.('background');
  });
  await advance(90000);
  expect(screen.getByRole('button', { name: 'Resume session' })).toBeTruthy();
  expect(wellnessApi.save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Resume session' }));
  await advance(50000);
  await fireEvent.press(screen.getByRole('button', { name: 'After your session: Good' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save session' }));
  await advance(0);
  expect(screen.getByRole('alert')).toBeTruthy();
  const original = jest.mocked(wellnessApi.save).mock.calls[0]?.[1];
  expect(original).toMatchObject({ durationSeconds: 60, pattern: 'coherent', afterMood: 4 });
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving session' }));
  await advance(0);
  expect(jest.mocked(wellnessApi.save).mock.calls[1]?.[1]).toEqual(original);
  expect(screen.getByText('Your session is saved.')).toBeTruthy();
});
it('ending early requires confirmation and never logs an incomplete session', async () => {
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Start breathing' }));
  await advance(10000);
  await fireEvent.press(screen.getByRole('button', { name: 'End session' }));
  expect(screen.getByText('End this practice?')).toBeTruthy();
  const actions = screen.getAllByRole('button', { name: 'End' });
  await fireEvent.press(actions[actions.length - 1]!);
  expect(screen.getByRole('button', { name: 'Start breathing' })).toBeTruthy();
  expect(wellnessApi.save).not.toHaveBeenCalled();
});

it('keeps customization optional and uses the selected duration when starting', async () => {
  await mount();
  expect(screen.queryByRole('button', { name: '3 min' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Customize' }));
  await fireEvent.press(screen.getByRole('button', { name: '3 min' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Close customization' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start breathing' }));
  await advance(60000);
  expect(screen.queryByRole('button', { name: 'Save session' })).toBeNull();
  await advance(120000);
  await fireEvent.press(screen.getByRole('button', { name: 'Save session' }));
  await advance(0);
  expect(wellnessApi.save).toHaveBeenCalledWith(
    'token',
    expect.objectContaining({ durationSeconds: 180 }),
  );
});

it('returns a saved practice to its original conversation as an unsent reflection', async () => {
  mockConversation = '550e8400-e29b-41d4-a716-446655440000';
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  await mount(client);
  expect(screen.queryByRole('button', { name: 'Reflect with Sol' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start breathing' }));
  await advance(60000);
  await fireEvent.press(screen.getByRole('button', { name: 'After your session: Low' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save session' }));
  await advance(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Reflect with Sol' }));
  expect(router.navigate).toHaveBeenCalledWith({
    pathname: '/chat/[id]',
    params: { id: mockConversation },
  });
  expect(client.getQueryData(chatDraftKey('a', mockConversation))).toMatchObject({
    text: 'I took a 1-minute breathing break. I feel Low now.',
    pending: null,
    origin: 'breathing',
  });
});
