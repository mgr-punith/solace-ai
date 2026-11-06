import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Screen } from '../../components/ui/Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from './context';
import { PrivacyChoice } from './PrivacyChoice';

export function PrivacyScreen() {
  const onboarding = useOnboarding();
  const [enabled, setEnabled] = useState(onboarding.choice ?? false);
  const { sky } = useTheme();
  return (
    <Screen>
      <Action secondary disabled={onboarding.busy} onPress={() => router.replace('/')}>
        Back
      </Action>
      <Surface>
        <AppText variant="title" accessibilityRole="header">
          Privacy and memory
        </AppText>
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
              if (saved) router.replace('/');
            });
          }}
        >
          Save choice
        </Action>
      </Surface>
    </Screen>
  );
}
