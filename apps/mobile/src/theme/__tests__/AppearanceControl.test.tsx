import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { AppearanceControl } from '../AppearanceControl';
import type { AppearanceStorage } from '../appearance';

jest.mock('../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
function Palette() {
  const { sky } = useTheme();
  return <Text>{sky.night ? 'Night palette' : 'Day palette'}</Text>;
}
it('uses three labeled choices, changes the theme and restores the preference on reopen', async () => {
  let saved: string | null = null;
  const disk: AppearanceStorage = {
    read: async () => saved,
    write: async (value) => {
      saved = value;
    },
  };
  const app = () => (
    <ThemeProvider storage={disk}>
      <AppearanceControl />
      <Palette />
    </ThemeProvider>
  );
  const first = await render(app());
  await fireEvent.press(await screen.findByRole('radio', { name: 'Dark' }));
  expect(screen.getByRole('radio', { name: 'Dark' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByText('Night palette')).toBeTruthy();
  expect(saved).toBe('night');
  await first.unmount();
  await render(app());
  expect(screen.getByRole('radio', { name: 'Dark' }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: 'Light' }));
  expect(screen.getByText('Day palette')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Auto' }));
  expect(saved).toBe('auto');
});
