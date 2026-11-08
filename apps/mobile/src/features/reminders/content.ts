import type { ReminderType } from '@solace/shared';
export const reminderLabels: Record<ReminderType, string> = {
  mood: 'Mood check-in',
  affirmation: 'Affirmation',
  breathing: 'Breathing',
  'self-care': 'Self-care',
  custom: 'Your own reminder',
};
export const affirmations = [
  'I can focus on today.',
  'My needs belong on the list too.',
  'I can deal with one thing at a time.',
  'I did what I could with the time I had.',
  'I need rest, and I can make time for it.',
  'I can be honest about how I feel.',
  'I can start again without rushing.',
] as const;
export function reminderBody(type: ReminderType, weekday: number, customText = '') {
  switch (type) {
    case 'mood':
      return 'How are you feeling? Your check-in is here when you’re ready.';
    case 'affirmation':
      return affirmations[(weekday - 1) % affirmations.length]!;
    case 'breathing':
      return 'Ready for a breathing break? Open Solace to start.';
    case 'self-care':
      return 'Time for the break you planned.';
    case 'custom':
      return customText || 'Here’s the reminder you set.';
  }
}
