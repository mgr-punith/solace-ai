import { z } from 'zod';

export const emotionTags = [
  'Calm',
  'Grateful',
  'Hopeful',
  'Tired',
  'Anxious',
  'Sad',
  'Lonely',
  'Frustrated',
  'Overwhelmed',
] as const;
export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/, 'Choose an IANA timezone name.')
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid timezone.');
export function localDay(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export const moodInputSchema = z.strictObject({
  requestId: z
    .string()
    .min(16)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/),
  mood: z.number().int().min(1).max(5),
  tags: z
    .array(z.enum(emotionTags))
    .max(5)
    .refine((tags) => new Set(tags).size === tags.length),
  note: z.string().trim().max(500),
  timezone: timezoneSchema,
});
export const moodCheckinSchema = z.object({
  id: z.uuid(),
  mood: z.number().int().min(1).max(5),
  tags: z.array(z.enum(emotionTags)),
  note: z.string(),
  timezone: timezoneSchema,
  createdAt: z.iso.datetime(),
});
export const moodResponseSchema = z.object({ checkin: moodCheckinSchema });
export const moodPageSchema = z.object({
  items: z.array(moodCheckinSchema),
  nextCursor: z.string().nullable(),
});
export const moodQuerySchema = z.strictObject({
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
  period: z.enum(['today', 'all']).default('all'),
  timezone: timezoneSchema.default('UTC'),
});
export type MoodInput = z.infer<typeof moodInputSchema>;
export type MoodCheckin = z.infer<typeof moodCheckinSchema>;
export type MoodPage = z.infer<typeof moodPageSchema>;
export type MoodQuery = z.infer<typeof moodQuerySchema>;
