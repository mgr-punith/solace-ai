import { useLocalSearchParams, router } from 'expo-router';
import { reminderTypes } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Companion } from '../../components/sol/Companion';
import { tokens } from '../../theme/tokens';
import { reminderBody, reminderLabels } from './content';
import { useReminders } from './context';
export function ReminderScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const reminders = useReminders();
  const kind = reminderTypes.find((value) => value === type);
  const custom = reminders.settings?.reminders.find((r) => r.type === 'custom')?.customText;
  return (
    <Screen centered>
      <Action secondary onPress={() => router.replace('/home')}>
        Back to Home
      </Action>
      <Companion size={tokens.sol.onboarding} state="greeting" />
      <Surface>
        <AppText variant="display" accessibilityRole="header">
          {kind ? reminderLabels[kind] : 'A moment for you'}
        </AppText>
        <AppText>
          {kind === 'custom' && !reminders.settings
            ? reminders.status === 'loading'
              ? 'Opening your reminder…'
              : 'Your saved message could not be opened. You can try again in Reminders.'
            : kind
              ? reminderBody(kind, new Date().getDay() + 1, custom)
              : 'This reminder is no longer available. You can choose a new one in Reminders.'}
        </AppText>
        {kind === 'breathing' && (
          <Action icon="wind" onPress={() => router.push('/breathing')}>
            Take a breathing break
          </Action>
        )}
        {kind === 'affirmation' && (
          <Action icon="book" onPress={() => router.push('/affirmations')}>
            Open affirmations
          </Action>
        )}
        <Action onPress={() => router.replace('/home')}>Check in</Action>
        <Action secondary onPress={() => router.replace('/talk')}>
          Talk with Sol
        </Action>
        <Action secondary onPress={() => router.replace('/reminders')}>
          Edit reminders
        </Action>
      </Surface>
    </Screen>
  );
}
