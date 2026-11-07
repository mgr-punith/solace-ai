import { z } from 'zod';
import { timezoneSchema } from './mood.ts';

export const reminderTypes = ['mood', 'affirmation', 'breathing', 'self-care', 'custom'] as const;
export const reminderTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const reminderSchema = z
  .strictObject({
    type: z.enum(reminderTypes),
    enabled: z.boolean(),
    time: reminderTimeSchema,
    // Expo weekly triggers use Sunday=1 through Saturday=7.
    days: z
      .array(z.number().int().min(1).max(7))
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    customText: z.string().trim().max(120),
  })
  .refine((r) => !r.enabled || r.days.length > 0, 'Choose at least one day.')
  .refine(
    (r) => r.type === 'custom' || r.customText === '',
    'Custom text belongs to your own reminder.',
  );
export const quietHoursSchema = z
  .strictObject({
    enabled: z.boolean(),
    start: reminderTimeSchema,
    end: reminderTimeSchema,
  })
  .refine((q) => !q.enabled || q.start !== q.end, 'Choose different start and end times.');
export const reminderSettingsSchema = z.strictObject({
  timezone: timezoneSchema,
  reminders: z
    .array(reminderSchema)
    .length(5)
    .refine((r) => new Set(r.map((v) => v.type)).size === 5),
  quietHours: quietHoursSchema,
});
export const reminderResponseSchema = z.object({ settings: reminderSettingsSchema });
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
export type ReminderType = (typeof reminderTypes)[number];
export type Reminder = ReminderSettings['reminders'][number];
export function defaultReminders(timezone = 'UTC'): ReminderSettings {
  return {
    timezone,
    reminders: reminderTypes.map((type) => ({
      type,
      enabled: false,
      time: '19:00',
      days: [1, 2, 3, 4, 5, 6, 7],
      customText: '',
    })),
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
  };
}
export function isQuietTime(time: string, quiet: ReminderSettings['quietHours']) {
  if (!quiet.enabled) return false;
  return quiet.start < quiet.end
    ? time >= quiet.start && time < quiet.end
    : time >= quiet.start || time < quiet.end;
}
