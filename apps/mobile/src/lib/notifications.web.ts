import { createReminderScheduler, type Permission } from '../features/reminders/scheduler';
export const notificationPermission = async (): Promise<Permission> => 'unsupported';
export const requestNotificationPermission = notificationPermission;
export const reminderScheduler = createReminderScheduler({
  cancel: async () => {},
  permission: notificationPermission,
  prepare: async () => {},
  schedule: async () => {},
});
export function observeNotificationTaps(_receive: (data: unknown) => void) {
  return () => {};
}
export async function clearNotificationResponse() {}
