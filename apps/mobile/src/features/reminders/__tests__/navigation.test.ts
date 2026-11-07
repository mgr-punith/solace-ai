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
  notificationTarget.set('/breathing');
  expect(notificationTarget.getSnapshot()).toBe('/breathing');
  notificationTarget.set(null);
  expect(notificationTarget.getSnapshot()).toBeNull();
});
it('opens real activities from both new and previously scheduled reminder payloads', () => {
  for (const [type, destination] of [
    ['mood', '/home'],
    ['breathing', '/breathing'],
    ['affirmation', '/affirmations'],
    ['self-care', '/wellness'],
  ]) {
    expect(parseReminderTarget({ route: `/reminder?type=${type}` })).toBe(destination);
    expect(parseReminderTarget({ route: destination })).toBe(destination);
  }
  expect(parseReminderTarget({ route: '/breathing?autostart=1' })).toBeNull();
});
