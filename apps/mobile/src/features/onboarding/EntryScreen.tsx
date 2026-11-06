import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { AuthScreen } from '../auth/AuthScreen';
import { useAuth } from '../auth/context';
import { useOnboarding } from './context';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';

export function EntryScreen() {
  const auth = useAuth();
  const onboarding = useOnboarding();
  const { sky } = useTheme();
  if (auth.status === 'restoring' || auth.status === 'error') return <AuthScreen />;
  if (!onboarding.identityReady)
    return (
      <Screen centered>
        <Surface>
          {onboarding.error ? (
            <>
              <AppText tone="error" accessibilityRole="alert">
                {onboarding.error}
              </AppText>
              <Action
                disabled={onboarding.busy}
                onPress={() => void onboarding.bindUser(auth.session?.user.id ?? null)}
              >
                Try opening again
              </Action>
            </>
          ) : (
            <>
              <ActivityIndicator
                color={sky.palette.text}
                accessibilityLabel="Opening your preferences"
              />
              <AppText>Opening your space…</AppText>
            </>
          )}
        </Surface>
      </Screen>
    );
  if (
    !auth.busy &&
    (auth.status === 'signedOut' || !auth.error) &&
    (onboarding.needsIntroduction || (auth.status === 'signedIn' && onboarding.needsChoice))
  )
    return <Redirect href="/onboarding" />;
  return <AuthScreen />;
}
