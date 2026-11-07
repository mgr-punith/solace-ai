import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createReminderScheduler, type Permission } from '../features/reminders/scheduler';

const channelId = 'gentle-reminders';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
export async function notificationPermission(): Promise<Permission> {
  const result = await Notifications.getPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : result.status === 'undetermined'
      ? 'undetermined'
      : 'denied';
}
async function prepare() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Gentle reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
}
export async function requestNotificationPermission() {
  await prepare();
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return notificationPermission();
}
export const reminderScheduler = createReminderScheduler({
  cancel: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  },
  permission: notificationPermission,
  prepare,
  schedule: async (item) => {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: { title: 'A moment with Sol', body: item.body, data: { route: item.route } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: item.weekday,
        hour: item.hour,
        minute: item.minute,
        channelId,
        delivery: 'bestEffort',
      },
    });
  },
});
export function observeNotificationTaps(receive: (data: unknown) => void) {
  let live = true;
  const seen = new Set<string>();
  function onResponse(response: Notifications.NotificationResponse | null) {
    if (!live || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
      return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    receive(response.notification.request.content.data);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
  void Notifications.getLastNotificationResponseAsync()
    .then(onResponse)
    .catch(() => {});
  return () => {
    live = false;
    subscription.remove();
  };
}
export async function clearNotificationResponse() {
  await Notifications.clearLastNotificationResponseAsync();
}
