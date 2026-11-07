import { isQuietTime, type ReminderSettings } from '@solace/shared';
import { reminderBody } from './content';
export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type PlannedReminder = {
  id: string;
  weekday: number;
  hour: number;
  minute: number;
  body: string;
  route: string;
};
export interface NotificationDriver {
  cancel(): Promise<void>;
  permission(): Promise<Permission>;
  prepare(): Promise<void>;
  schedule(item: PlannedReminder): Promise<void>;
}
export function reminderPlan(settings: ReminderSettings): PlannedReminder[] {
  return settings.reminders.flatMap((r) => {
    if (!r.enabled || isQuietTime(r.time, settings.quietHours)) return [];
    const [hour, minute] = r.time.split(':').map(Number);
    return r.days.map((weekday) => ({
      id: `solace-${r.type}-${weekday}`,
      weekday,
      hour: hour!,
      minute: minute!,
      body: reminderBody(r.type, weekday, r.customText),
      route: r.type === 'mood' ? '/home' : `/reminder?type=${r.type}`,
    }));
  });
}
export function createReminderScheduler(native: NotificationDriver) {
  let queue = Promise.resolve();
  function run<T>(action: () => Promise<T>) {
    const result = queue.then(action);
    queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  return {
    clear: () => run(() => native.cancel()),
    reconcile: (settings: ReminderSettings) =>
      run(async () => {
        await native.cancel();
        const permission = await native.permission();
        if (permission !== 'granted') return { permission, count: 0 };
        try {
          await native.prepare();
          const plan = reminderPlan(settings);
          for (const item of plan) await native.schedule(item);
          return { permission, count: plan.length };
        } catch (error) {
          await native.cancel();
          throw error;
        }
      }),
  };
}
