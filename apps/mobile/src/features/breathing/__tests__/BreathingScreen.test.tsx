import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Alert, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { BreathingScreen } from '../BreathingScreen';
import { wellnessApi } from '../../wellness/api';
jest.mock('../../wellness/api', () => ({ wellnessApi: { save: jest.fn() } }));
jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  usePreventRemove: jest.fn(),
  router: { replace: jest.fn(), canGoBack: () => false },
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
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Start breathing' }));
  await advance(10000);
  await fireEvent.press(screen.getByRole('button', { name: 'End session' }));
  await act(async () => {
    alert.mock.calls[0]?.[2]?.find((button) => button.text === 'End session')?.onPress?.();
  });
  expect(screen.getByRole('button', { name: 'Start breathing' })).toBeTruthy();
  expect(wellnessApi.save).not.toHaveBeenCalled();
});
