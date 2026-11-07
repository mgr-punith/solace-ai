import { afterEach, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NotificationNavigation } from '../context';
import { notificationTarget } from '../navigation';
let mockSignedIn = false;
let mockNeedsIntro = false;
let mockPathname = '/';
let mockType: string | undefined;
jest.mock('../../auth/context', () => ({
  useAuth: () => ({ status: mockSignedIn ? 'signedIn' : 'signedOut' }),
}));
jest.mock('../../onboarding/context', () => ({
  useOnboarding: () => ({
    identityReady: true,
    needsIntroduction: mockNeedsIntro,
    needsChoice: false,
  }),
}));
jest.mock('../runtime', () => ({ reminderManager: {} }));
jest.mock('../../../lib/notifications', () => ({ observeNotificationTaps: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useRootNavigationState: () => ({ key: 'root' }),
  usePathname: () => mockPathname,
  useGlobalSearchParams: () => ({ type: mockType }),
}));
afterEach(() => {
  notificationTarget.set(null);
  jest.useRealTimers();
  mockSignedIn = false;
  mockNeedsIntro = false;
  mockPathname = '/';
  mockType = undefined;
});
it('retains a tap through sign-in, onboarding and navigation until the destination opens', async () => {
  jest.useFakeTimers();
  notificationTarget.set('/reminder?type=breathing');
  const view = await render(<NotificationNavigation />);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  expect(router.replace).not.toHaveBeenCalled();
  expect(notificationTarget.getSnapshot()).toBe('/reminder?type=breathing');
  mockSignedIn = true;
  mockNeedsIntro = true;
  await view.rerender(<NotificationNavigation />);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  expect(router.replace).not.toHaveBeenCalled();
  mockNeedsIntro = false;
  await view.rerender(<NotificationNavigation />);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  expect(router.replace).toHaveBeenCalledWith('/reminder?type=breathing');
  // The entry screen must still redirect to the reminder while replace is queued.
  expect(notificationTarget.getSnapshot()).toBe('/reminder?type=breathing');
  await view.rerender(<NotificationNavigation />);
  expect(router.replace).toHaveBeenCalledTimes(1);
  mockPathname = '/reminder';
  mockType = 'affirmation';
  await view.rerender(<NotificationNavigation />);
  expect(notificationTarget.getSnapshot()).toBe('/reminder?type=breathing');
  mockType = 'breathing';
  await view.rerender(<NotificationNavigation />);
  expect(notificationTarget.getSnapshot()).toBeNull();
});

it('consumes a Home reminder already at its destination without navigating again', async () => {
  jest.useFakeTimers();
  mockSignedIn = true;
  mockPathname = '/home';
  notificationTarget.set('/home');
  await render(<NotificationNavigation />);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  expect(notificationTarget.getSnapshot()).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
});
