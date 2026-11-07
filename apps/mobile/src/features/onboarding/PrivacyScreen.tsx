import { useScreenBack } from '../../lib/useScreenBack';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { PageHeader } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from './context';
import { PrivacyChoice } from './PrivacyChoice';

export function PrivacyScreen() {
  const goBack = useScreenBack('/you');
  const onboarding = useOnboarding();
  const [enabled, setEnabled] = useState(onboarding.choice ?? false);
  const { sky } = useTheme();
  return (
    <Screen>
      <PageHeader title="Privacy and memory" back={goBack} />
      <Surface>
        <Icon name="privacy" />
        <PrivacyChoice enabled={enabled} onChange={setEnabled} disabled={onboarding.busy} />
        {onboarding.error && (
          <AppText tone="error" accessibilityRole="alert">
            {onboarding.error}
          </AppText>
        )}
        {onboarding.busy && (
          <ActivityIndicator color={sky.palette.text} accessibilityLabel="Saving your choice" />
        )}
        <Action
          disabled={onboarding.busy}
          onPress={() => {
            void onboarding.complete(enabled).then((saved) => {
              if (saved) goBack();
            });
          }}
        >
          Save choice
        </Action>
      </Surface>
    </Screen>
  );
}
