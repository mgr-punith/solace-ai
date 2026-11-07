import { expect, it } from 'vitest';
import { defaultReminders, reminderSettingsSchema, isQuietTime } from './reminders.js';

it('starts with every reminder off and validates times, days, types and private ownership', () => {
  const settings = defaultReminders('Asia/Kolkata');
  expect(settings.reminders.every((r) => !r.enabled)).toBe(true);
  expect(reminderSettingsSchema.safeParse(settings).success).toBe(true);
  for (const change of [
    { time: '25:00' },
    { days: [0] },
    { days: [1, 1] },
    { enabled: true, days: [] },
  ]) {
    expect(
      reminderSettingsSchema.safeParse({
        ...settings,
        reminders: [{ ...settings.reminders[0], ...change }, ...settings.reminders.slice(1)],
      }).success,
    ).toBe(false);
  }
  expect(reminderSettingsSchema.safeParse({ ...settings, userId: 'someone' }).success).toBe(false);
  expect(
    reminderSettingsSchema.safeParse({
      ...settings,
      reminders: [settings.reminders[0], settings.reminders[0]],
    }).success,
  ).toBe(false);
});

it('quiet hours include their start, exclude their end and cross midnight', () => {
  const quiet = { enabled: true, start: '22:00', end: '08:00' };
  expect(['22:00', '23:59', '00:00', '07:59'].every((time) => isQuietTime(time, quiet))).toBe(true);
  expect(isQuietTime('08:00', quiet)).toBe(false);
  expect(isQuietTime('12:00', { ...quiet, start: '12:00', end: '14:00' })).toBe(true);
  expect(isQuietTime('23:00', { ...quiet, enabled: false })).toBe(false);
  expect(
    reminderSettingsSchema.safeParse({
      ...defaultReminders(),
      quietHours: { ...quiet, end: '22:00' },
    }).success,
  ).toBe(false);
});
