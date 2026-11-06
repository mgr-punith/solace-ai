import { describe, it, expect } from 'vitest';
import { localDay, moodInputSchema, timezoneSchema } from './mood.js';

describe('mood contract and local dates', () => {
  it('respects midnight and timezone travel', () => {
    const now = new Date('2026-11-06T18:31:00Z');
    expect(localDay(now, 'Asia/Kolkata')).toBe('2026-11-07');
    expect(localDay(now, 'America/Los_Angeles')).toBe('2026-11-06');
  });
  it('groups both occurrences of a DST hour into the same day', () => {
    expect(localDay(new Date('2026-11-01T05:30:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(localDay(new Date('2026-11-01T06:30:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(timezoneSchema.safeParse('Not/AZone').success).toBe(false);
    expect(timezoneSchema.safeParse('+05:30').success).toBe(false);
  });
  it('rejects invalid mood, duplicate tags, excessive notes and caller-supplied user IDs', () => {
    const valid = {
      requestId: 'mood-test-request-001',
      mood: 3,
      tags: [],
      note: '',
      timezone: 'UTC',
    };
    expect(moodInputSchema.parse(valid)).toEqual(valid);
    for (const extra of [
      { mood: 0 },
      { mood: 6 },
      { tags: ['Calm', 'Calm'] },
      { note: 'x'.repeat(501) },
      { userId: 'someone' },
    ]) {
      expect(moodInputSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
});
