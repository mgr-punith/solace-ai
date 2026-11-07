import { z } from 'zod';
import { timezoneSchema } from './mood.ts';

const lines = [
  'You can take today one moment at a time.',
  'Your needs deserve a little space today.',
  'You do not have to solve everything at once.',
  'A small step can be enough for now.',
  'Rest is something you are allowed to need.',
  'There is room for how you feel today.',
  'You can begin again at your own pace.',
  'You can ask for a little help with the next step.',
  'One unfinished task does not describe your whole day.',
  'You can be uncertain and still make a choice.',
  'A quiet moment does not have to be earned.',
  'You can change your mind when you learn something new.',
  'Your pace can be different from someone else’s.',
  'You can notice a feeling without fixing it right away.',
  'A kind word to yourself can be a place to start.',
  'You are allowed to say that something is difficult.',
  'You can choose one thing to set down for a while.',
  'A pause can belong in the middle of a busy day.',
  'You do not need perfect words to reach out.',
  'You can care about someone and still need space.',
  'You can let a good moment be small.',
  'Today can hold more than one feeling.',
  'You can take a break before you reach your limit.',
  'Your effort matters even when it is hard to see.',
  'You can make room for what you need next.',
  'You do not have to explain every feeling.',
  'You can leave some questions unanswered tonight.',
  'A boundary can be a way of caring for yourself.',
  'You can appreciate something without feeling happy all day.',
  'You are allowed to learn as you go.',
  'You can start with the part that feels manageable.',
  'You do not have to turn every moment into progress.',
  'You can be patient with a part of yourself that is tired.',
  'Your attention can return to what is here now.',
  'You can notice what helped, even a little.',
  'You are allowed to need company.',
  'You can take your own concerns seriously.',
  'There can be value in simply showing up.',
  'You can choose a gentler next step.',
  'Your worth does not depend on a full to-do list.',
  'You can allow yourself time to settle.',
  'You do not need to compare this day with your best day.',
  'You can tell someone that you need them to listen.',
  'You can enjoy something without making it useful.',
  'An awkward moment does not define a relationship.',
  'You can be proud of something only you noticed.',
  'You are allowed to rest while things are unfinished.',
  'You can make a little room for curiosity.',
  'You can choose what deserves your attention today.',
  'You do not have to rush a difficult conversation.',
  'You can acknowledge a mistake without being cruel to yourself.',
  'You can look for one thing that feels steady.',
  'You are allowed to want something different.',
  'You can let someone know what would help.',
  'You can listen to yourself with a little more patience.',
  'You can take a moment before saying yes.',
  'You do not have to carry every worry alone.',
  'You can return to something you care about after a break.',
  'You can notice the effort it took to get here.',
  'This moment can be enough to begin with.',
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
