import { useScreenBack } from '../../lib/useScreenBack';
import { useLocalSearchParams, router, Redirect } from 'expo-router';
import { reminderTypes } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Companion } from '../../components/sol/Companion';
import { tokens } from '../../theme/tokens';
import { reminderBody, reminderLabels } from './content';
import { useReminders } from './context';
import { reminderDestinations } from './navigation';
export function ReminderScreen() {
  const goBack = useScreenBack('/home');
  const { type } = useLocalSearchParams<{ type?: string }>();
  const reminders = useReminders();
  const kind = reminderTypes.find((value) => value === type);
  const custom = reminders.settings?.reminders.find((r) => r.type === 'custom')?.customText;
  // Preserve old deep links while removing the extra activity landing page.
  if (kind && kind !== 'custom') return <Redirect href={reminderDestinations[kind]} />;
  return (
    <Screen centered>
      <Action secondary onPress={goBack}>
        Back
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
        <Action onPress={() => router.replace('/wellness')}>Take a moment</Action>
        <Action variant="quiet" onPress={() => router.replace('/reminders')}>
          Edit reminders
        </Action>
      </Surface>
    </Screen>
  );
}
