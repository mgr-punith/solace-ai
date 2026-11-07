import { expect, it, jest } from '@jest/globals';
import { defaultReminders } from '@solace/shared';
import { createReminderScheduler, reminderPlan, type NotificationDriver } from '../scheduler';

function driver() {
  const scheduled: string[] = [];
  const native: NotificationDriver = {
    cancel: jest.fn(async () => {
      scheduled.length = 0;
    }),
    permission: async () => 'granted',
    prepare: async () => {},
    schedule: jest.fn<NotificationDriver['schedule']>(async (item) => {
      scheduled.push(item.id);
    }),
  };
  return { native, scheduled };
}
it('repeated reconciliation leaves one notification per chosen day and excludes quiet hours', async () => {
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  settings.reminders[0]!.days = [2, 4];
  settings.reminders[1]!.enabled = true;
  settings.reminders[1]!.time = '23:00';
  const { native, scheduled } = driver();
  const scheduler = createReminderScheduler(native);
  await scheduler.reconcile(settings);
  await scheduler.reconcile(settings);
  expect(scheduled).toEqual(['solace-mood-2', 'solace-mood-4']);
  expect(native.cancel).toHaveBeenCalledTimes(2);
  expect(reminderPlan(settings)[0]).toMatchObject({
    weekday: 2,
    hour: 19,
    minute: 0,
    route: '/home',
  });
});
it('denied permission cancels existing schedules and does not ask for permission', async () => {
  const { native, scheduled } = driver();
  native.permission = async () => 'denied';
  const scheduler = createReminderScheduler(native);
  expect(await scheduler.reconcile(defaultReminders())).toEqual({ permission: 'denied', count: 0 });
  expect(scheduled).toEqual([]);
  expect(native.cancel).toHaveBeenCalledTimes(1);
});
it('cleans partial schedules after failure and serializes sign-out behind in-flight scheduling', async () => {
  const { native, scheduled } = driver();
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  const scheduler = createReminderScheduler(native);
  await Promise.all([scheduler.reconcile(settings), scheduler.clear()]);
  expect(scheduled).toEqual([]);
  native.schedule = async () => {
    throw new Error('OS failure');
  };
  await expect(scheduler.reconcile(settings)).rejects.toThrow('OS failure');
  expect(scheduled).toEqual([]);
});
it('rotates affirmation content by weekday and only allows supported deep links', () => {
  const settings = defaultReminders();
  settings.reminders[1]!.enabled = true;
  const plan = reminderPlan(settings);
  expect(new Set(plan.map((v) => v.body)).size).toBe(7);
  expect(plan.every((v) => v.route === '/reminder?type=affirmation')).toBe(true);
});
