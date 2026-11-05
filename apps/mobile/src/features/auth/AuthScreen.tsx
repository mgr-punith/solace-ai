import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { tokens } from '../../theme/tokens';
import { useAuth } from './context';

export function AuthScreen() {
  const auth = useAuth();
  const dark = useColorScheme() === 'dark';
  const palette = dark ? tokens.night : tokens.day;
  function confirmDelete() {
    Alert.alert(
      'Delete your Solace account?',
      'This permanently deletes your account and everything you saved in Solace.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void auth.deleteAccount();
          },
        },
      ],
    );
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          Solace
        </Text>
        <Text style={[styles.body, { color: palette.secondary }]}>Take a breath. You’re here.</Text>
        <View accessibilityLiveRegion="polite" style={styles.status}>
          {auth.status === 'restoring' ? (
            <>
              <ActivityIndicator color={palette.text} accessibilityLabel="Restoring your session" />
              <Text style={[styles.body, { color: palette.text }]}>Opening your space…</Text>
            </>
          ) : auth.status === 'signedIn' ? (
            <>
              <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
                Welcome, {auth.session?.user.name}.
              </Text>
              <Text style={[styles.body, { color: palette.secondary }]}>
                You’re signed in. Your space is ready.
              </Text>
            </>
          ) : (
            <Text style={[styles.body, { color: palette.text }]}>
              Sign in to keep your check-ins and conversations in your space.
            </Text>
          )}
          {auth.busy && auth.status !== 'restoring' && (
            <ActivityIndicator color={palette.text} accessibilityLabel="Finishing your request" />
          )}
          {auth.error && <Text style={[styles.body, { color: palette.error }]}>{auth.error}</Text>}
        </View>
        {auth.status === 'signedIn' ? (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={auth.busy}
              accessibilityState={{ disabled: auth.busy }}
              onPress={() => {
                void auth.logout();
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Sign out</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={auth.busy}
              accessibilityState={{ disabled: auth.busy }}
              onPress={confirmDelete}
              style={styles.secondaryButton}
            >
              <Text style={[styles.body, { color: palette.text }]}>Delete account</Text>
            </Pressable>
          </>
        ) : auth.status === 'error' ? (
          <Pressable
            accessibilityRole="button"
            disabled={auth.busy}
            onPress={() => {
              void auth.restore();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try opening again</Text>
          </Pressable>
        ) : (
          auth.status === 'signedOut' &&
          (Platform.OS === 'android' ? (
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={dark ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
              disabled={auth.busy}
              accessibilityLabel="Sign in with Google"
              style={styles.googleButton}
              onPress={() => {
                void auth.signIn();
              }}
            />
          ) : (
            <Text style={[styles.body, { color: palette.secondary }]}>
              Google sign-in is available in the Android development app.
            </Text>
          ))
        )}
        <Text style={[styles.body, { color: palette.secondary }]}>
          Solace is a companion, not a therapist, and is not a substitute for professional care.
        </Text>
        {auth.status === 'signedOut' && (
          <Text style={[styles.body, { color: palette.secondary }]}>
            We use your Google name and email to create your account. You can delete your account
            anytime.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.title,
    lineHeight: tokens.typography.titleLine,
    fontWeight: '600',
  },
  body: { fontSize: tokens.typography.body, lineHeight: tokens.typography.bodyLine },
  status: { marginVertical: tokens.spacing.lg, gap: tokens.spacing.md },
  button: {
    minHeight: tokens.target,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.action.background,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
  },
  buttonText: {
    fontSize: tokens.typography.body,
    lineHeight: tokens.typography.bodyLine,
    fontWeight: '600',
    color: tokens.action.text,
  },
  secondaryButton: {
    minHeight: tokens.target,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  googleButton: { width: '100%', height: tokens.target },
});
