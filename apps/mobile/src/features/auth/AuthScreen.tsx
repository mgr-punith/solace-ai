import { ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { NavigationRow, PageHeader } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useOnboarding } from '../onboarding/context';
import { useAuth } from './context';
import { firstName } from '../home/greeting';

export function AuthScreen() {
  const auth = useAuth();
  const onboarding = useOnboarding();
  const { sky } = useTheme();
  const busy = auth.busy || onboarding.busy;
  function confirmDelete() {
    const userId = auth.session?.user.id;
    if (!userId) return;
    Alert.alert(
      'Delete your Solace account?',
      'This permanently deletes your account and everything you saved in Solace.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void auth.deleteAccount(async () => {
              if (!(await onboarding.removeAccount(userId)))
                throw new Error(
                  'Your local privacy choice couldn’t be cleared. Try deleting again.',
                );
            });
          },
        },
      ],
    );
  }
  return (
    <Screen centered={auth.status !== 'signedIn'} inTabs={auth.status === 'signedIn'}>
      {auth.status === 'signedIn' ? (
        <PageHeader title="You" />
      ) : (
        <Companion size={tokens.sol.hero} state="greeting" />
      )}
      <Surface
        accessibilityLiveRegion="polite"
        style={auth.status === 'signedIn' ? styles.account : undefined}
      >
        <AppText
          variant={auth.status === 'signedIn' ? 'heading' : 'display'}
          accessibilityRole="header"
        >
          {auth.status === 'signedIn'
            ? `Hello, ${firstName(auth.session?.user.name)}.`
            : 'A little space, just for you.'}
        </AppText>
        {auth.status === 'restoring' ? (
          <>
            <ActivityIndicator
              color={sky.palette.text}
              accessibilityLabel="Restoring your session"
            />
            <AppText>Opening your space…</AppText>
          </>
        ) : auth.status === 'signedOut' ? (
          <AppText tone="secondary">
            Sign in to start your space. Your Google name and email create your account.
          </AppText>
        ) : null}
        {busy && auth.status !== 'restoring' && (
          <ActivityIndicator color={sky.palette.text} accessibilityLabel="Finishing your request" />
        )}
        {auth.error && (
          <AppText tone="error" accessibilityRole="alert">
            {auth.error}
          </AppText>
        )}
        {onboarding.error && (
          <AppText tone="error" accessibilityRole="alert">
            {onboarding.error}
          </AppText>
        )}
        {auth.status === 'error' && (
          <Action disabled={busy} onPress={() => void auth.restore()}>
            Try opening again
          </Action>
        )}
        {auth.status === 'signedOut' &&
          (Platform.OS === 'android' ? (
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={sky.night ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
              disabled={busy}
              accessibilityLabel="Sign in with Google"
              style={styles.googleButton}
              onPress={() => void auth.signIn()}
            />
          ) : (
            <AppText tone="secondary">
              Google sign-in is available in the Android development app.
            </AppText>
          ))}
        {auth.status === 'signedIn' && (
          <>
            <NavigationRow
              icon="bell"
              title="Reminders"
              subtitle="A gentle nudge, on your terms"
              disabled={busy}
              onPress={() => router.push('/reminders')}
            />
            <NavigationRow
              icon="privacy"
              title="Privacy"
              subtitle="What Sol can use, and how to delete it"
              disabled={busy}
              onPress={() => router.push('/privacy')}
            />
            <NavigationRow
              icon="heart"
              title="Saved affirmations"
              subtitle="Words you want to return to"
              disabled={busy}
              onPress={() => router.push('/affirmations?saved=1')}
            />
            <NavigationRow
              icon="support"
              title="Need support now?"
              subtitle="Find someone you can reach out to"
              disabled={busy}
              onPress={() => router.push('/support')}
            />
          </>
        )}
        {(auth.status === 'signedOut' || auth.status === 'signedIn') && (
          <NavigationRow
            icon="book"
            title="Review introduction"
            disabled={busy}
            onPress={() => router.push('/onboarding?review=1')}
          />
        )}
        {auth.status === 'signedIn' && (
          <>
            {__DEV__ && (
              <NavigationRow
                icon="settings"
                title="Meet Sol · Preview"
                disabled={busy}
                onPress={() => router.push('/design-preview')}
              />
            )}
            <NavigationRow
              icon="logout"
              title="Sign out"
              disabled={busy}
              onPress={() => void auth.logout()}
            />
            <NavigationRow
              icon="delete"
              title="Delete account"
              destructive
              disabled={busy}
              onPress={confirmDelete}
            />
          </>
        )}
        <AppText variant="bodySmall" tone="secondary">
          Solace is an AI companion, not a therapist or a substitute for professional care.
        </AppText>
      </Surface>
    </Screen>
  );
}
const styles = StyleSheet.create({
  googleButton: { width: '100%', height: tokens.target },
  account: {
    backgroundColor: tokens.colors.clear,
    borderWidth: 0,
    padding: 0,
    gap: tokens.spacing.sm,
  },
});
