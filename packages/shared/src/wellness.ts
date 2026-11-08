import { z } from 'zod';
import { timezoneSchema } from './mood.ts';

const lines = [
  'I can focus on today.',
  'My needs belong on the list too.',
  'I can deal with one thing at a time.',
  'I did what I could with the time I had.',
  'I need rest, and I can make time for it.',
  'I can be honest about how I feel.',
  'I can start again without rushing.',
  'I can ask someone to help.',
  'One unfinished task doesn’t cancel out what I did today.',
  'I can make a choice without knowing how it will turn out.',
  'I don’t have to earn a break.',
  'I’m allowed to change my mind after learning more.',
  'I have my own pace.',
  'I can feel this without deciding what to do about it yet.',
  'I can speak to myself the way I’d speak to a friend.',
  'I can say, “This is hard for me.”',
  'I can leave one thing for tomorrow.',
  'I can stop for a minute, even on a busy day.',
  '“Can we talk?” is enough to start.',
  'I care about them, and I need time alone too.',
  'Something good happened today. I want to remember it.',
  'I can feel more than one thing about today.',
  'I can stop before I’m exhausted.',
  'I know how much effort that took.',
  'I can make time for something I need.',
  'I don’t need an explanation for each feeling.',
  'I can leave that question until morning.',
  'I can say no when I don’t have the time or energy.',
  'I enjoyed that part, even on a hard day.',
  'I’m still learning how to do this.',
  'I’ll start with the part I know how to do.',
  'I can spend an afternoon without improving anything.',
  'I’m tired. I can expect less of myself today.',
  'I can bring my attention back to what I’m doing.',
  'I noticed something that helped. I can try it again.',
  'I’d like some company, and I can say so.',
  'If it worries me, it’s worth talking about.',
  'I showed up today, even though it was hard.',
  'I can choose an easier way to do this.',
  'I’m more than what I finish in a day.',
  'I can give myself time to settle in.',
  'I don’t have the same energy every day.',
  'I can ask someone to listen without offering advice.',
  'I can do something because I enjoy it.',
  'One awkward conversation doesn’t erase a friendship.',
  'I’m proud of that, even if no one else saw it.',
  'The work can wait while I rest.',
  'I don’t know yet. I can find out.',
  'I can choose what to spend my attention on.',
  'I can take time before having that conversation.',
  'I made a mistake. I can try to put it right.',
  'I can return to something familiar today.',
  'I want something different, and I can explore that.',
  'I can tell someone what would help me.',
  'I can give myself time to work out what I need.',
  'I can say, “Let me think about it.”',
  'I can tell someone about the thing I keep worrying over.',
  'I can pick this up again after a break.',
  'I remember what it took to get this far.',
  'I can start from where I am today.',
] as const;
export const affirmations = lines.map((text, index) => ({
  id: `sol-${String(index + 1).padStart(2, '0')}`,
  text,
}));
const affirmationIds = new Set(affirmations.map((item) => item.id));
export const affirmationIdSchema = z
  .string()
  .refine((id) => affirmationIds.has(id), 'Choose an available affirmation.');
export const affirmationSchema = z.object({ id: affirmationIdSchema, text: z.string() });
export type Affirmation = z.infer<typeof affirmationSchema>;
export function affirmationForDay(day: string): Affirmation {
  const index = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return affirmations[((index % affirmations.length) + affirmations.length) % affirmations.length]!;
}
export const breathingPatterns = {
  box: {
    name: 'Box',
    description: 'In 4 · hold 4 · out 4 · rest 4',
    phases: [4000, 4000, 4000, 4000],
  },
  '478': { name: '4–7–8', description: 'In 4 · hold 7 · out 8', phases: [4000, 7000, 8000, 0] },
  coherent: {
    name: 'Coherent',
    description: 'In 5.5 · out 5.5 · no holds',
    phases: [5500, 0, 5500, 0],
  },
} as const;
export type BreathingPattern = keyof typeof breathingPatterns;
export const breathingPatternSchema = z.enum(['box', '478', 'coherent']);
export const practiceDurations = [60, 180, 300] as const;
const base = {
  requestId: z
    .string()
    .min(16)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/),
  timezone: timezoneSchema,
};
const mood = z.number().int().min(1).max(5).nullable();
export const activityInputSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...base,
    type: z.literal('breathing'),
    pattern: breathingPatternSchema,
    durationSeconds: z.union([z.literal(60), z.literal(180), z.literal(300)]),
    beforeMood: mood,
    afterMood: mood,
  }),
  z.strictObject({ ...base, type: z.literal('affirmation'), affirmationId: affirmationIdSchema }),
]);
export type ActivityInput = z.infer<typeof activityInputSchema>;
export const activitySchema = z.object({
  id: z.uuid(),
  type: z.enum(['breathing', 'affirmation']),
  completedAt: z.iso.datetime(),
});
export const activityResponseSchema = z.object({ activity: activitySchema });
export const favoritesSchema = z.object({ items: z.array(affirmationSchema).max(60) });
export const wellnessQuerySchema = z.strictObject({ timezone: timezoneSchema.default('UTC') });
export const progressDaySchema = z.object({
  day: z.iso.date(),
  moodAverage: z.number().min(1).max(5).nullable(),
  actions: z.number().int().nonnegative(),
  breathingSeconds: z.number().int().nonnegative(),
  breathingSessions: z.number().int().nonnegative(),
});
export type ProgressDay = z.infer<typeof progressDaySchema>;
export const progressSchema = z.object({
  timezone: timezoneSchema,
  today: z.iso.date(),
  currentStreak: z.number().int().nonnegative(),
  totalDays: z.number().int().nonnegative(),
  welcomeBack: z.boolean(),
  days: z.array(progressDaySchema).length(7),
});
export type WellnessProgress = z.infer<typeof progressSchema>;
// Calendar arithmetic on date labels, never 24-hour arithmetic on local instants (DST).
export function shiftDay(day: string, offset: number): string {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
export function summarizeProgress(
  rows: ProgressDay[],
  today: string,
  timezone: string,
): WellnessProgress {
  const byDay = new Map(
    rows.filter((row) => row.day <= today && row.actions > 0).map((row) => [row.day, row]),
  );
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);
  let currentStreak = 0;
  while (byDay.has(cursor)) {
    currentStreak++;
    cursor = shiftDay(cursor, -1);
  }
  return {
    timezone,
    today,
    currentStreak,
    totalDays: byDay.size,
    welcomeBack: byDay.size > 0 && currentStreak === 0,
    days: Array.from({ length: 7 }, (_, index) => {
      const day = shiftDay(today, index - 6);
      return (
        byDay.get(day) ?? {
          day,
          moodAverage: null,
          actions: 0,
          breathingSeconds: 0,
          breathingSessions: 0,
        }
      );
    }),
  };
}
