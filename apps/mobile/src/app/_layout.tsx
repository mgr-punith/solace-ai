import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../features/auth/context';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { SkyBackground } from '../theme/SkyBackground';
import { tokens } from '../theme/tokens';
import { surfaceAt } from '../theme/sky';
import { OnboardingProvider, useOnboarding } from '../features/onboarding/context';
import { StartupGate } from '../features/onboarding/StartupGate';
import { ReminderProvider, NotificationNavigation } from '../features/reminders/context';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { sky, reduceMotion } = useTheme();
  const onboarding = useOnboarding();
  const auth = useAuth();
  return (
    <>
      <SkyBackground />
      <StatusBar style={sky.night ? 'light' : 'dark'} />
      <StartupGate>
        <NavigationThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, background: tokens.colors.clear },
          }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduceMotion ? 'none' : 'fade',
              contentStyle: { backgroundColor: surfaceAt(sky, 1) },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="support" />
            <Stack.Protected guard={onboarding.identityReady}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected
              guard={
                onboarding.identityReady && !onboarding.needsIntroduction && !onboarding.needsChoice
              }
            >
              <Stack.Screen name="privacy" />
              <Stack.Protected guard={auth.status === 'signedIn'}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="chat/[id]" />
                <Stack.Screen name="reminders" />
                <Stack.Screen name="reminder" />
                <Stack.Screen name="breathing" />
                <Stack.Screen name="affirmations" />
              </Stack.Protected>
              <Stack.Protected guard={__DEV__}>
                <Stack.Screen name="design-preview" />
              </Stack.Protected>
            </Stack.Protected>
          </Stack>
          <NotificationNavigation />
        </NavigationThemeProvider>
      </StartupGate>
    </>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <ReminderProvider>
              <AppNavigation />
            </ReminderProvider>
          </OnboardingProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
