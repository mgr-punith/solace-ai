import { reminderTypes } from '@solace/shared';
export type ReminderTarget = '/home' | `/reminder?type=${(typeof reminderTypes)[number]}`;
const targets = new Set<string>([
  '/home',
  ...reminderTypes.map((type) => `/reminder?type=${type}`),
]);
export function parseReminderTarget(data: unknown): ReminderTarget | null {
  if (!data || typeof data !== 'object' || !('route' in data) || typeof data.route !== 'string')
    return null;
  return targets.has(data.route) ? (data.route as ReminderTarget) : null;
}
let target: ReminderTarget | null = null;
const listeners = new Set<() => void>();
export const notificationTarget = {
  getSnapshot: () => target,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set: (value: ReminderTarget | null) => {
    target = value;
    for (const listener of listeners) listener();
  },
};
