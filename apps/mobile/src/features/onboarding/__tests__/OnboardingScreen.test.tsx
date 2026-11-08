import { beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Redirect, router } from 'expo-router';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { OnboardingProvider } from '../context';
import { onboardingStorage } from '../storage';
import { OnboardingScreen } from '../OnboardingScreen';
import { EntryScreen } from '../EntryScreen';
import { useAuth } from '../../auth/context';

jest.mock('../../auth/context', () => ({ useAuth: jest.fn() }));
jest.mock('../../auth/AuthScreen', () => ({ AuthScreen: () => null }));
jest.mock('../storage', () => ({ onboardingStorage: { read: jest.fn(), write: jest.fn() } }));
jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
  Redirect: jest.fn(() => null),
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));
let saved: string | null;
const auth = {
  request: async <T,>(action: (token: string) => Promise<T>) => action('test'),
  status: 'signedOut' as const,
  session: null,
  busy: false,
  error: null,
  restore: jest.fn<() => Promise<void>>(),
  signIn: jest.fn<() => Promise<void>>(),
  logout: jest.fn<() => Promise<void>>(),
  deleteAccount: jest.fn<() => Promise<void>>(),
};
function App({ entry = false }: { entry?: boolean }) {
  return (
    <ThemeProvider>
      <OnboardingProvider>{entry ? <EntryScreen /> : <OnboardingScreen />}</OnboardingProvider>
    </ThemeProvider>
  );
}
beforeEach(() => {
  saved = null;
  jest.mocked(useAuth).mockReturnValue(auth);
  jest.mocked(onboardingStorage.read).mockImplementation(async () => saved);
  jest.mocked(onboardingStorage.write).mockImplementation(async (value) => {
    saved = value;
  });
});
it('skip still shows current privacy without inactive memory controls, and requires successful acknowledgement', async () => {
  await render(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Skip intro' }).props.accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Skip intro' }));
  expect(screen.getByText('Your privacy.')).toBeTruthy();
  expect(screen.queryByRole('switch')).toBeNull();
  expect(screen.getByText(/Sol uses the current conversation/)).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  jest.mocked(onboardingStorage.write).mockRejectedValueOnce(new Error('disk full'));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to sign in' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to sign in' }));
  expect(router.replace).toHaveBeenCalledWith('/');
  expect(JSON.parse(saved!)).toMatchObject({ completed: true, pendingChoice: false });
});
it('does not save the practice mood as consent, and preserves the current step', async () => {
  await render(<App />);
  await act(async () => {});
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Heavy, 1 of 5' }));
  expect(screen.getByText('This is a practice check-in. Solace won’t save it.')).toBeTruthy();
  expect(JSON.parse(saved!)).toMatchObject({ step: 1, pendingChoice: null, choices: {} });
});
it('never exposes a previous account preference during an identity change', async () => {
  saved = JSON.stringify({
    version: 1,
    step: 3,
    completed: true,
    pendingChoice: null,
    choices: { a: true },
  });
  const session = {
    user: { id: 'a', name: 'Maya', email: 'maya@example.invalid', avatarUrl: null },
    accessToken: 'test',
    refreshToken: 'test',
    accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  };
  jest.mocked(useAuth).mockReturnValue({ ...auth, status: 'signedIn', session });
  const view = await render(<App entry />);
  await act(async () => {});
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]).toMatchObject({ href: '/home' });
  jest.mocked(Redirect).mockClear();
  jest.mocked(useAuth).mockReturnValue({
    ...auth,
    status: 'signedIn',
    session: { ...session, user: { ...session.user, id: 'b' } },
  });
  await view.rerender(<App entry />);
  await waitFor(() =>
    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]).toMatchObject({ href: '/onboarding' }),
  );
  expect(JSON.parse(saved!).choices.b).toBeUndefined();
});
