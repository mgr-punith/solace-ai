import { afterAll, beforeEach, expect, it, jest } from '@jest/globals';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isErrorWithCode: jest.fn(() => false),
  isSuccessResponse: jest.fn((result: { type: string }) => result.type === 'success'),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

const originalWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const originalIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin;
let platform: { OS: 'android' | 'ios' };
let googleConfigureOptions: typeof import('../google').googleConfigureOptions;
let googleSignIn: typeof import('../google').googleSignIn;

beforeEach(() => {
  jest.resetModules();
  ({ GoogleSignin } = jest.requireMock('@react-native-google-signin/google-signin'));
  ({ Platform: platform } = jest.requireMock('react-native'));
  ({ googleConfigureOptions, googleSignIn } = jest.requireActual('../google'));
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client.apps.googleusercontent.com';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client.apps.googleusercontent.com';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebClientId;
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIosClientId;
});

it('returns the native ID token after configuring Google Sign-In', async () => {
  jest.mocked(GoogleSignin.hasPlayServices).mockResolvedValue(true);
  jest.mocked(GoogleSignin.signIn).mockResolvedValue({
    type: 'success',
    data: { idToken: 'native-id-token' },
  } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);

  await expect(googleSignIn.signIn()).resolves.toBe('native-id-token');
  expect(GoogleSignin.configure).toHaveBeenCalledTimes(1);
  expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({
    showPlayServicesUpdateDialog: true,
  });
});

it('keeps Android on the shared Web token audience', () => {
  expect(googleConfigureOptions('android')).toEqual({
    webClientId: 'web-client.apps.googleusercontent.com',
  });
});

it('adds the native iOS client ID without changing the Web token audience', () => {
  expect(googleConfigureOptions('ios')).toEqual({
    webClientId: 'web-client.apps.googleusercontent.com',
    iosClientId: 'ios-client.apps.googleusercontent.com',
  });
});

it('signs in on iOS with its registered client and no Android Play services check', async () => {
  platform.OS = 'ios';
  jest.mocked(GoogleSignin.signIn).mockResolvedValue({
    type: 'success',
    data: { idToken: 'ios-id-token' },
  } as Awaited<ReturnType<typeof GoogleSignin.signIn>>);

  await expect(googleSignIn.signIn()).resolves.toBe('ios-id-token');
  expect(GoogleSignin.configure).toHaveBeenCalledWith({
    webClientId: 'web-client.apps.googleusercontent.com',
    iosClientId: 'ios-client.apps.googleusercontent.com',
  });
  expect(GoogleSignin.hasPlayServices).not.toHaveBeenCalled();
});

it('keeps cancellation on iOS recoverable without a token', async () => {
  platform.OS = 'ios';
  jest.mocked(GoogleSignin.signIn).mockResolvedValue({ type: 'cancelled', data: null });

  await expect(googleSignIn.signIn()).resolves.toBeNull();
});

it('reports missing iOS configuration before opening native sign-in', async () => {
  platform.OS = 'ios';
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  await expect(googleSignIn.signIn()).rejects.toThrow('Google sign-in is not configured for iOS');
  expect(GoogleSignin.configure).not.toHaveBeenCalled();
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
});
