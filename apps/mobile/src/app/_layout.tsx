import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  usePathname,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../features/auth/context';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { SkyBackground } from '../theme/SkyBackground';
import { tokens } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { sky, fontsLoaded, fontError, reduceMotion } = useTheme();
  const path = usePathname();
  const scheme = useColorScheme();
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <>
      <SkyBackground />
      <StatusBar
        style={(path === '/design-preview' ? sky.night : scheme === 'dark') ? 'light' : 'dark'}
      />
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
        />
      </NavigationThemeProvider>
    </>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigation />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
