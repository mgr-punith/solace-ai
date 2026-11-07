import { reminderScheduler, clearNotificationResponse } from '../../lib/notifications';
import { createReminderStore } from './store';
import { reminderStorage } from './storage';
import { notificationTarget } from './navigation';
export const reminderManager = createReminderStore({
  storage: reminderStorage,
  scheduler: reminderScheduler,
  timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
});
export async function clearDeviceReminders(intentional = false) {
  // An expired session must retain a notification's destination through sign-in.
  if (intentional) notificationTarget.set(null);
  await reminderManager.bindUser(null);
  await clearNotificationResponse();
}
