import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Screen } from '../../components/ui/Screen';
import Sol from '../../components/sol/Sol';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import * as SplashScreen from 'expo-splash-screen';
import { useOnboarding } from './context';

export function StartupGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const onboarding = useOnboarding();
  const [greeted, setGreeted] = useState(false);
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const fontsReady = theme.fontsLoaded || !!theme.fontError || fontTimedOut;
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);
  useEffect(() => {
    if (!fontsReady || onboarding.status !== 'ready') return;
    const timer = setTimeout(
      () => setGreeted(true),
      theme.reduceMotion ? 0 : tokens.motion.startup,
    );
    return () => clearTimeout(timer);
  }, [fontsReady, onboarding.status, theme.reduceMotion]);
  if (greeted && onboarding.status === 'ready') return children;
  return (
    <Screen centered>
      <View style={styles.sol}>
        <Sol
          state="greeting"
          mood={2}
          active={theme.active}
          reduceMotion={theme.reduceMotion}
          greeting={0}
        />
      </View>
      <Surface>
        <AppText variant="display" accessibilityRole="header">
          Take a breath.{'\n'}You’re here.
        </AppText>
        {onboarding.status === 'error' ? (
          <>
            <AppText tone="error" accessibilityRole="alert">
              {onboarding.error}
            </AppText>
            <Action onPress={() => void onboarding.restore()}>Try opening again</Action>
          </>
        ) : (
          <>
            {onboarding.status === 'loading' && (
              <>
                <ActivityIndicator
                  accessibilityLabel="Opening your introduction"
                  color={theme.sky.palette.text}
                />
                <AppText tone="secondary">Opening Solace…</AppText>
              </>
            )}
            {onboarding.status === 'ready' && (
              <Action onPress={() => setGreeted(true)}>Continue</Action>
            )}
          </>
        )}
      </Surface>
    </Screen>
  );
}
const styles = StyleSheet.create({ sol: { alignSelf: 'center' } });
