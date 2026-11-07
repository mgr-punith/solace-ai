import type { ReminderType } from '@solace/shared';
export const reminderLabels: Record<ReminderType, string> = {
  mood: 'Mood check-in',
  affirmation: 'Affirmation',
  breathing: 'Breathing',
  'self-care': 'Self-care',
  custom: 'Your own reminder',
};
export const affirmations = [
  'You can take today one moment at a time.',
  'Your needs deserve a little space today.',
  'You do not have to solve everything at once.',
  'A small step can be enough for now.',
  'Rest is something you are allowed to need.',
  'There is room for how you feel today.',
  'You can begin again at your own pace.',
] as const;
export function reminderBody(type: ReminderType, weekday: number, customText = '') {
  switch (type) {
    case 'mood':
      return 'How are you feeling? Take a moment to check in, if you like.';
    case 'affirmation':
      return affirmations[(weekday - 1) % affirmations.length]!;
    case 'breathing':
      return 'A pause is here if you need it. Let your next breath come gently, at your own pace.';
    case 'self-care':
      return 'Is there one small thing you need right now? A stretch, some water, or a little rest?';
    case 'custom':
      return customText || 'A little moment for yourself, when you are ready.';
  }
}
