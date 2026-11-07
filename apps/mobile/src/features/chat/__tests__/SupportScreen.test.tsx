jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { canGoBack: () => false, replace: jest.fn() },
}));
import { expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { SupportScreen } from '../SupportScreen';
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
it('requires a region choice and explicit dialer action, with a recoverable dialer error', async () => {
  jest.mocked(Linking.openURL).mockRejectedValue(new Error('no dialer'));
  await render(
    <ThemeProvider>
      <SupportScreen />
    </ThemeProvider>,
  );
  expect(screen.queryByText('14416')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'India' }));
  expect(Linking.openURL).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Open dialer: 14416' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(Linking.openURL).toHaveBeenCalledWith('tel:14416');
});
