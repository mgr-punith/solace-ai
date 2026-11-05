import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../../theme/tokens';
import { checkConnection } from './api';

export function FoundationScreen() {
  const palette = useColorScheme() === 'dark' ? tokens.night : tokens.day;
  const connection = useQuery({
    queryKey: ['foundation', 'ready'],
    queryFn: () => checkConnection(process.env.EXPO_PUBLIC_API_URL),
    enabled: false,
    retry: false,
  });
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          Solace
        </Text>
        <Text style={[styles.body, { color: palette.secondary }]}>Take a breath. You’re here.</Text>
        <View style={styles.status} accessibilityLiveRegion="polite">
          {connection.isFetching ? (
            <>
              <ActivityIndicator color={palette.text} accessibilityLabel="Checking connection" />
              <Text style={[styles.body, { color: palette.text }]}>Connecting…</Text>
            </>
          ) : connection.isError ? (
            <Text style={[styles.body, { color: palette.error }]}>{connection.error.message}</Text>
          ) : connection.data ? (
            <Text style={[styles.body, { color: palette.text }]}>Connected. Solace is ready.</Text>
          ) : (
            <Text style={[styles.body, { color: palette.secondary }]}>
              Check the connection when you’re ready.
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={connection.isError ? 'Try connection again' : 'Check connection'}
          accessibilityState={{ disabled: connection.isFetching }}
          disabled={connection.isFetching}
          onPress={() => {
            void connection.refetch();
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {connection.isError ? 'Try again' : 'Check connection'}
          </Text>
        </Pressable>
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
});
