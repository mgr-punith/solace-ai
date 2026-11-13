import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
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
import { AppearanceControl } from '../../theme/AppearanceControl';
import { ConfirmSheet, type ConfirmSheetState } from '../../components/ui/ConfirmSheet';

export function AuthScreen() {
  const auth = useAuth();
  const onboarding = useOnboarding();
  const { sky } = useTheme();
  const [confirmation, setConfirmation] = useState<ConfirmSheetState | null>(null);
  const busy = auth.busy || onboarding.busy;
  function confirmDelete() {
    const userId = auth.session?.user.id;
    if (!userId) return;
    setConfirmation({
      title: 'Delete your Solace account?',
      message: 'This permanently deletes your account and everything you saved in Solace.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'delete',
      onConfirm: () => {
        void auth
          .deleteAccount(async () => {
            if (!(await onboarding.removeAccount(userId)))
              throw new Error('Your local privacy choice couldn’t be cleared. Try deleting again.');
          })
          .then(() => setConfirmation(null))
          .catch(() => {});
      },
    });
  }
  return (
    <>
      <Screen centered={auth.status !== 'signedIn'} inTabs={auth.status === 'signedIn'}>
        {auth.status === 'signedIn' ? (
          <PageHeader title="You" subtitle={`Hello, ${firstName(auth.session?.user.name)}.`} />
        ) : (
          <Companion size={tokens.sol.hero} state="greeting" />
        )}
        <Surface
          accessibilityLiveRegion="polite"
          style={auth.status === 'signedIn' ? styles.account : undefined}
        >
          {auth.status !== 'signedIn' && (
            <AppText variant="display" accessibilityRole="header">
              Welcome to Solace.
            </AppText>
          )}
          {auth.status === 'restoring' ? (
            <>
              <ActivityIndicator
                color={sky.palette.text}
                accessibilityLabel="Restoring your session"
              />
              <AppText>Signing you in…</AppText>
            </>
          ) : auth.status === 'signedOut' ? (
            <AppText tone="secondary">
              Sign in with Google to save your check-ins and chats. Solace uses your name and email
              to create your account.
            </AppText>
          ) : null}
          {busy && auth.status !== 'restoring' && (
            <ActivityIndicator
              color={sky.palette.text}
              accessibilityLabel="Finishing your request"
            />
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
            (Platform.OS === 'android' || Platform.OS === 'ios' ? (
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
                Open the iOS or Android app to sign in with Google.
              </AppText>
            ))}
          {auth.status === 'signedIn' && (
            <>
              <Surface>
                <AppearanceControl />
              </Surface>
              <Surface style={styles.rows}>
                <NavigationRow
                  icon="bell"
                  title="Reminders"
                  subtitle="Choose the days and times"
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
                  subtitle="Read your favorites"
                  disabled={busy}
                  onPress={() => router.push('/affirmations?saved=1')}
                />
              </Surface>
              <Surface style={styles.rows}>
                <NavigationRow
                  icon="support"
                  title="Need support now?"
                  subtitle="Find a crisis helpline"
                  disabled={busy}
                  onPress={() => router.push('/support')}
                />
                <NavigationRow
                  icon="book"
                  title="Review introduction"
                  disabled={busy}
                  onPress={() => router.push('/onboarding?review=1')}
                />
              </Surface>
            </>
          )}
          {auth.status === 'signedOut' && (
            <NavigationRow
              icon="book"
              title="Review introduction"
              disabled={busy}
              onPress={() => router.push('/onboarding?review=1')}
            />
          )}
          {auth.status === 'signedIn' && (
            <Surface style={styles.rows}>
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
            </Surface>
          )}
          <AppText variant="bodySmall" tone="secondary">
            Solace is an AI companion, not a therapist or a substitute for professional care.
          </AppText>
        </Surface>
      </Screen>
      <ConfirmSheet
        state={confirmation}
        onDismiss={() => setConfirmation(null)}
        pending={auth.busy}
      />
    </>
  );
}
const styles = StyleSheet.create({
  googleButton: { width: '100%', height: tokens.target },
  rows: { gap: 0 },
  account: {
    backgroundColor: tokens.colors.clear,
    borderWidth: 0,
    padding: 0,
    gap: tokens.spacing.md,
  },
});
