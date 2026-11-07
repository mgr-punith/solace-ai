import { expect, it } from '@jest/globals';
import { notificationTarget, parseReminderTarget } from '../navigation';
it('accepts only known reminder destinations and retains a target until login navigation consumes it', () => {
  expect(parseReminderTarget({ route: '/home' })).toBe('/home');
  expect(parseReminderTarget({ route: '/reminder?type=custom' })).toBe('/reminder?type=custom');
  for (const route of [
    'https://example.com',
    '/chat/another-users-id',
    '/reminder?type=custom&userId=other',
    '//example.com',
    '/missing',
  ])
    expect(parseReminderTarget({ route })).toBeNull();
  notificationTarget.set('/reminder?type=breathing');
  expect(notificationTarget.getSnapshot()).toBe('/reminder?type=breathing');
  notificationTarget.set(null);
  expect(notificationTarget.getSnapshot()).toBeNull();
});
