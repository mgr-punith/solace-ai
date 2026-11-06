import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../features/auth/context';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { SkyBackground } from '../theme/SkyBackground';
import { tokens } from '../theme/tokens';
import { OnboardingProvider, useOnboarding } from '../features/onboarding/context';
import { StartupGate } from '../features/onboarding/StartupGate';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { sky, reduceMotion } = useTheme();
  const onboarding = useOnboarding();
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
              contentStyle: { backgroundColor: tokens.colors.clear },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Protected guard={onboarding.identityReady}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected
              guard={
                onboarding.identityReady && !onboarding.needsIntroduction && !onboarding.needsChoice
              }
            >
              <Stack.Screen name="privacy" />
              <Stack.Protected guard={__DEV__}>
                <Stack.Screen name="design-preview" />
              </Stack.Protected>
            </Stack.Protected>
          </Stack>
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
            <AppNavigation />
          </OnboardingProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
