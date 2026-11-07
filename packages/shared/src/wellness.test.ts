import { expect, it } from 'vitest';
import {
  affirmationForDay,
  affirmations,
  activityInputSchema,
  shiftDay,
  summarizeProgress,
} from './wellness.ts';
import { localDay } from './mood.ts';
it('counts unique consecutive calendar days and keeps yesterday current, without future credit', () => {
  const day = (date: string) => ({
    day: date,
    moodAverage: null,
    actions: 1,
    breathingSeconds: 0,
    breathingSessions: 0,
  });
  const rows = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08'].map(day);
  const result = summarizeProgress(rows, '2026-11-07', 'Asia/Kolkata');
  expect(result.currentStreak).toBe(3);
  expect(result.days).toHaveLength(7);
  expect(result.days.at(-1)?.actions).toBe(0);
  expect(summarizeProgress(rows.slice(0, 2), '2026-11-07', 'Asia/Kolkata').welcomeBack).toBe(true);
  expect(summarizeProgress([], '2026-11-07', 'UTC').currentStreak).toBe(0);
});
it('uses local midnight, DST calendar days, year boundaries and travel rather than elapsed 24 hours', () => {
  expect(localDay(new Date('2026-11-07T18:29:59Z'), 'Asia/Kolkata')).toBe('2026-11-07');
  expect(localDay(new Date('2026-11-07T18:30:00Z'), 'Asia/Kolkata')).toBe('2026-11-08');
  for (const day of ['2026-03-08', '2026-11-01']) expect(shiftDay(shiftDay(day, -1), 1)).toBe(day);
  expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31');
  expect(localDay(new Date('2026-11-07T02:00:00Z'), 'America/Los_Angeles')).toBe('2026-11-06');
  expect(localDay(new Date('2026-11-07T02:00:00Z'), 'Asia/Tokyo')).toBe('2026-11-07');
});
it('rotates original daily affirmations deterministically and validates activities', () => {
  expect(affirmations).toHaveLength(60);
  expect(new Set(affirmations.map((line) => line.id)).size).toBe(60);
  expect(affirmationForDay('2026-11-07')).toEqual(affirmationForDay('2026-11-07'));
  expect(affirmationForDay('2026-11-08')).not.toEqual(affirmationForDay('2026-11-07'));
  const base = {
    requestId: 'request-123456789',
    timezone: 'UTC',
    type: 'breathing',
    pattern: 'box',
    durationSeconds: 60,
    beforeMood: null,
    afterMood: 3,
  };
  expect(activityInputSchema.safeParse(base).success).toBe(true);
  for (const extra of [
    { durationSeconds: 1 },
    { pattern: 'unknown' },
    { afterMood: 8 },
    { userId: 'owner' },
    { completedAt: '2026-01-01' },
  ])
    expect(activityInputSchema.safeParse({ ...base, ...extra }).success).toBe(false);
});
