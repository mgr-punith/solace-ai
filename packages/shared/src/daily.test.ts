import { expect, it } from 'vitest';
import { dailyRecommendations, dailyWellnessSchema, type DailyWellness } from './daily.ts';
import { affirmationForDay } from './wellness.ts';

const today: DailyWellness = {
  day: '2026-11-09',
  timezone: 'Asia/Kolkata',
  checkedIn: false,
  breathingSessions: 0,
  readAffirmationIds: [],
};
it('offers three concrete choices with a duration and reason without a check-in', () => {
  const options = dailyRecommendations(null, today);
  expect(options.map((option) => option.id)).toEqual(['breathing', 'affirmation', 'reflection']);
  expect(options.every((option) => option.minutes > 0 && option.reason.length > 10)).toBe(true);
  expect(options.some((option) => option.completed)).toBe(false);
});
it('uses selected tags before the mood score and never needs the private note', () => {
  const options = dailyRecommendations({ mood: 5, tags: ['Anxious'] }, today);
  expect(options[0]).toMatchObject({ id: 'breathing', reason: expect.stringContaining('Anxious') });
  expect(dailyRecommendations({ mood: 2, tags: ['Tired'] }, today)[0]?.id).toBe('affirmation');
  expect(dailyRecommendations({ mood: 4, tags: ['Grateful'] }, today)[0]?.id).toBe('reflection');
});
it('moves completed choices behind unfinished ones without removing them', () => {
  const options = dailyRecommendations(
    { mood: 1, tags: ['Overwhelmed'] },
    {
      ...today,
      breathingSessions: 2,
      readAffirmationIds: [affirmationForDay(today.day).id],
    },
  );
  expect(options[0]?.id).toBe('reflection');
  expect(options.find((option) => option.id === 'breathing')?.completed).toBe(true);
  expect(options.find((option) => option.id === 'affirmation')?.completed).toBe(true);
  expect(options).toHaveLength(3);
});
it('does not mark today’s words read because a different affirmation was read', () => {
  const options = dailyRecommendations(null, { ...today, readAffirmationIds: ['sol-01'] });
  expect(affirmationForDay(today.day).id).not.toBe('sol-01');
  expect(options.find((option) => option.id === 'affirmation')?.completed).toBe(false);
});
it('validates daily status instead of accepting fabricated dates or unknown activities', () => {
  expect(dailyWellnessSchema.safeParse(today).success).toBe(true);
  expect(dailyWellnessSchema.safeParse({ ...today, readAffirmationIds: ['unknown'] }).success).toBe(
    false,
  );
  expect(dailyWellnessSchema.safeParse({ ...today, day: 'yesterday' }).success).toBe(false);
});
