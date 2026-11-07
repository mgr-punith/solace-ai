import { afterEach, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { NotificationNavigation } from '../context';
import { notificationTarget } from '../navigation';
let mockSignedIn = false;
let mockNeedsIntro = false;
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
}));
afterEach(() => {
  notificationTarget.set(null);
  jest.useRealTimers();
  mockSignedIn = false;
  mockNeedsIntro = false;
});
it('retains a tap through sign-in and onboarding, then navigates and consumes it once', async () => {
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
  expect(notificationTarget.getSnapshot()).toBeNull();
  await view.rerender(<NotificationNavigation />);
  expect(router.replace).toHaveBeenCalledTimes(1);
});
