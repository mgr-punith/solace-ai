import { z } from 'zod';
import { timezoneSchema, type MoodCheckin } from './mood.ts';
import { affirmationForDay, affirmationIdSchema } from './wellness.ts';

export const dailyWellnessSchema = z.object({
  day: z.iso.date(),
  timezone: timezoneSchema,
  checkedIn: z.boolean(),
  breathingSessions: z.number().int().nonnegative(),
  readAffirmationIds: z.array(affirmationIdSchema).max(60),
});
export type DailyWellness = z.infer<typeof dailyWellnessSchema>;
export type DailyRecommendation = {
  id: 'breathing' | 'affirmation' | 'reflection';
  title: string;
  reason: string;
  description: string;
  minutes: number;
  action: string;
  completed: boolean;
  draft: string | null;
};

/** Curated, current-day suggestions. No notes, chat history, model call or inferred diagnosis. */
export function dailyRecommendations(
  mood: Pick<MoodCheckin, 'mood' | 'tags'> | null,
  daily: DailyWellness,
): DailyRecommendation[] {
  const tense = mood?.tags.find((tag) => ['Anxious', 'Overwhelmed', 'Frustrated'].includes(tag));
  const tired = mood?.tags.includes('Tired');
  const positive = mood?.tags.find((tag) => ['Calm', 'Grateful', 'Hopeful'].includes(tag));
  const low = mood !== null && mood.mood <= 2;
  const reflect = !tense && !tired && !low && (positive || (mood?.mood ?? 0) >= 4);
  const options: DailyRecommendation[] = [
    {
      id: 'breathing',
      title: 'Take a breathing pause',
      reason: tense
        ? `You chose ${tense} in your check-in. A short pause gives you one thing to focus on.`
        : 'A one-minute practice fits between the things you need to do.',
      description: 'Follow Sol at a comfortable pace. You can pause or stop at any time.',
      minutes: 1,
      action: 'Breathe for a minute',
      completed: daily.breathingSessions > 0,
      draft: null,
    },
    {
      id: 'affirmation',
      title: 'Read today’s words',
      reason: tired
        ? 'You chose Tired in your check-in. Reading a few words takes little effort.'
        : low
          ? `You chose ${mood.mood === 1 ? 'Heavy' : 'Low'} in your check-in. Start with something that asks little of you.`
          : 'See whether today’s affirmation says something you want to remember.',
      description: 'Read it once, then save it if it fits your day.',
      minutes: 1,
      action: 'Read today’s words',
      completed: daily.readAffirmationIds.includes(affirmationForDay(daily.day).id),
      draft: null,
    },
    {
      id: 'reflection',
      title: reflect ? 'Remember a good part' : 'Put a thought into words',
      reason: positive
        ? `You chose ${positive} in your check-in. You could write about what contributed to that.`
        : reflect
          ? 'Your check-in was positive. Write down a moment you’d like to remember.'
          : 'Writing a sentence can give you a place to start a conversation.',
      description: 'Open a prompt with Sol, edit it, and send it when you’re ready.',
      minutes: 2,
      action: 'Reflect with Sol',
      completed: false,
      draft: reflect
        ? 'One part of today I’d like to remember is…'
        : 'One thing on my mind today is…',
    },
  ];
  const preferred = tense
    ? 'breathing'
    : tired || low
      ? 'affirmation'
      : reflect
        ? 'reflection'
        : 'breathing';
  return options.sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      Number(b.id === preferred) - Number(a.id === preferred),
  );
}
