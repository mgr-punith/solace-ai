import { expect, it, jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { defaultReminders } from '@solace/shared';
import {
  reminderScheduler,
  requestNotificationPermission,
  observeNotificationTaps,
} from '../notifications';
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
it('creates the Android channel before requesting permission, schedules weekly routes and cancels all on cleanup', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
  } as Notifications.NotificationPermissionsStatus);
  await requestNotificationPermission();
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    'gentle-reminders',
    expect.objectContaining({ enableVibrate: false, sound: null }),
  );
  expect(
    jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]!,
  ).toBeLessThan(jest.mocked(Notifications.requestPermissionsAsync).mock.invocationCallOrder[0]!);
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  settings.reminders[0]!.days = [3];
  await reminderScheduler.reconcile(settings);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ data: { route: '/home' } }),
      trigger: {
        type: 'weekly',
        weekday: 3,
        hour: 19,
        minute: 0,
        channelId: 'gentle-reminders',
        delivery: 'bestEffort',
      },
    }),
  );
  await reminderScheduler.clear();
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
  expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalledTimes(2);
});
it('reads cold-start and live taps once, clears the native response and removes the listener', async () => {
  const response = {
    actionIdentifier: 'default',
    notification: {
      date: 1,
      request: {
        identifier: 'solace-mood-2',
        trigger: null,
        content: {
          title: 'Solace',
          subtitle: null,
          body: 'A gentle reminder',
          sound: null,
          categoryIdentifier: null,
          threadIdentifier: null,
          data: { route: '/home' },
        },
      },
    },
  } satisfies Notifications.NotificationResponse;
  const remove = jest.fn();
  let live!: (r: Notifications.NotificationResponse) => void;
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(response);
  jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mockImplementation((callback) => {
      live = callback;
      return { remove };
    });
  const receive = jest.fn();
  const stop = observeNotificationTaps(receive);
  await Promise.resolve();
  live(response);
  expect(receive).toHaveBeenCalledTimes(1);
  expect(receive).toHaveBeenCalledWith({ route: '/home' });
  live({ ...response, notification: { ...response.notification, date: 2 } });
  expect(receive).toHaveBeenCalledTimes(2);
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(2);
  stop();
  expect(remove).toHaveBeenCalled();
});
