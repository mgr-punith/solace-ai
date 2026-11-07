import { reminderTypes, type ReminderType } from '@solace/shared';
export type ReminderTarget =
  '/home' | '/breathing' | '/affirmations' | '/wellness' | '/reminder?type=custom';
export const reminderDestinations: Record<ReminderType, ReminderTarget> = {
  mood: '/home',
  breathing: '/breathing',
  affirmation: '/affirmations',
  'self-care': '/wellness',
  custom: '/reminder?type=custom',
};
const targets = new Map<string, ReminderTarget>(
  Object.values(reminderDestinations).map((route) => [route, route]),
);
for (const type of reminderTypes) targets.set(`/reminder?type=${type}`, reminderDestinations[type]);
export function parseReminderTarget(data: unknown): ReminderTarget | null {
  if (!data || typeof data !== 'object' || !('route' in data) || typeof data.route !== 'string')
    return null;
  return targets.get(data.route) ?? null;
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
