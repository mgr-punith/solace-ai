import { afterEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { AuthScreen } from '../AuthScreen';
import { useAuth } from '../context';
import { ThemeProvider } from '../../../theme/ThemeProvider';

jest.mock('../context', () => ({ useAuth: jest.fn() }));
jest.mock('../../../components/sol/Companion', () => ({ Companion: () => null }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('../../onboarding/context', () => ({
  useOnboarding: () => ({ busy: false, error: null, removeAccount: async () => true }),
}));
jest.mock('@react-native-google-signin/google-signin', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    GoogleSigninButton: Object.assign(
      (props: import('@react-native-google-signin/google-signin').GoogleSigninButtonProps) => (
        <Pressable {...props} accessibilityRole="button" />
      ),
      {
        Size: { Wide: 1 },
        Color: { Light: 'light', Dark: 'dark' },
      },
    ),
  };
});
const signOut = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const deleteAccount = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const restore = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const state = {
  request: async <T,>(action: (token: string) => Promise<T>) => action('test'),
  status: 'signedIn' as const,
  busy: false,
  error: null,
  session: {
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Maya',
      email: 'maya@example.invalid',
      avatarUrl: null,
    },
    accessToken: 'access',
    refreshToken: 'refresh'.repeat(8),
    accessTokenExpiresAt: '2026-11-05T12:15:00Z',
  },
  signIn: jest.fn<() => Promise<void>>(),
  logout: signOut,
  deleteAccount,
  restore,
};
afterEach(() => {
  jest.restoreAllMocks();
});

it.each(['ios', 'android'] as const)('offers actionable Google sign-in on %s', async (platform) => {
  jest.replaceProperty(Platform, 'OS', platform);
  jest.mocked(useAuth).mockReturnValue({ ...state, status: 'signedOut', session: null });
  await render(
    <ThemeProvider>
      <AuthScreen />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
  expect(state.signIn).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Open the Android app/)).toBeNull();
});

it.each(['ios', 'android'] as const)(
  'prevents duplicate sign-in while busy on %s',
  async (platform) => {
    jest.replaceProperty(Platform, 'OS', platform);
    jest
      .mocked(useAuth)
      .mockReturnValue({ ...state, status: 'signedOut', session: null, busy: true });
    await render(
      <ThemeProvider>
        <AuthScreen />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: 'Sign in with Google' });
    await fireEvent.press(button);
    expect(state.signIn).not.toHaveBeenCalled();
  },
);

it('directs browser visitors to either supported native app', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  jest.mocked(useAuth).mockReturnValue({ ...state, status: 'signedOut', session: null });
  await render(
    <ThemeProvider>
      <AuthScreen />
    </ThemeProvider>,
  );
  expect(screen.queryByRole('button', { name: 'Sign in with Google' })).toBeNull();
  expect(screen.getByText('Open the iOS or Android app to sign in with Google.')).toBeTruthy();
});

it('requires a destructive confirmation before deleting an account', async () => {
  jest.mocked(useAuth).mockReturnValue(state);
  await render(
    <ThemeProvider>
      <AuthScreen />
    </ThemeProvider>,
  );
  expect(screen.getByText('Hello, Maya.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  expect(deleteAccount).not.toHaveBeenCalled();
  expect(screen.getByText('Delete your Solace account?')).toBeTruthy();
  expect(screen.getByText(/everything you saved in Solace/)).toBeTruthy();
  const actions = screen.getAllByRole('button', { name: 'Delete' });
  await fireEvent.press(actions[actions.length - 1]!);
  expect(deleteAccount).toHaveBeenCalledTimes(1);
});
it('shows a startup network error with a retry action instead of signed-in content', async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ ...state, status: 'error', error: 'Check your connection and try again.' });
  await render(
    <ThemeProvider>
      <AuthScreen />
    </ThemeProvider>,
  );
  expect(screen.queryByText('Hello, Maya.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Try opening again' }));
  expect(restore).toHaveBeenCalled();
});
