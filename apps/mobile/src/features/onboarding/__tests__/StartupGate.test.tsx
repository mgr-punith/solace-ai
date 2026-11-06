import { afterEach, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StartupGate } from '../StartupGate';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useFonts } from 'expo-font';

jest.mock('../context', () => ({ useOnboarding: () => ({ status: 'ready' }) }));
jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: jest.fn(), isLoaded: () => true }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));
afterEach(() => {
  jest.useRealTimers();
});
it('leaves startup immediately when Reduce Motion is enabled', async () => {
  jest.useFakeTimers();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  await render(
    <ThemeProvider>
      <StartupGate>
        <Text>App opened</Text>
      </StartupGate>
    </ThemeProvider>,
  );
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.getByText('App opened')).toBeTruthy();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
});
it('releases the native splash and uses fallback text if fonts stall', async () => {
  jest.useFakeTimers();
  jest.mocked(useFonts).mockReturnValue([false, null]);
  await render(
    <ThemeProvider>
      <StartupGate>
        <Text>App opened</Text>
      </StartupGate>
    </ThemeProvider>,
  );
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(4000);
  });
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
  expect(screen.getByText('App opened')).toBeTruthy();
});
