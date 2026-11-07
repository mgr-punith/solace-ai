import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
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
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSigninButton: Object.assign(() => null, {
    Size: { Wide: 1 },
    Color: { Light: 'light', Dark: 'dark' },
  }),
}));
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
it('requires a destructive confirmation before deleting an account', async () => {
  jest.mocked(useAuth).mockReturnValue(state);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(
    <ThemeProvider>
      <AuthScreen />
    </ThemeProvider>,
  );
  expect(screen.getByText('Hello, Maya.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  expect(deleteAccount).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith(
    'Delete your Solace account?',
    expect.any(String),
    expect.any(Array),
  );
  const buttons = alert.mock.calls[0]?.[2];
  buttons?.find((button) => button.text === 'Delete account')?.onPress?.();
  expect(deleteAccount).toHaveBeenCalledTimes(1);
  alert.mockRestore();
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
