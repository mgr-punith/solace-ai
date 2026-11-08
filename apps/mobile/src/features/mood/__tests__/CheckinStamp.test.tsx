import { beforeEach, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { CheckinStamp } from '../CheckinStamp';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useMotionPreferences } from '../../../lib/useMotionPreferences';

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../../../lib/useMotionPreferences', () => ({ useMotionPreferences: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
beforeEach(() => {
  mockFocused = true;
  jest.mocked(useMotionPreferences).mockReturnValue({ active: true, reduceMotion: true });
});
it('keeps a static saved status with Reduce Motion and consumes its one-time feedback', async () => {
  const played = jest.fn();
  const tree = () => (
    <ThemeProvider>
      <CheckinStamp animate onPlayed={played} />
    </ThemeProvider>
  );
  const app = await render(tree());
  expect(screen.getByText('Check-in saved')).toBeTruthy();
  expect(played).toHaveBeenCalledTimes(1);
  mockFocused = false;
  await app.rerender(tree());
  mockFocused = true;
  await app.rerender(tree());
  expect(played).toHaveBeenCalledTimes(1);
});
it('shows a saved record without triggering fresh feedback when revisiting', async () => {
  const played = jest.fn();
  await render(
    <ThemeProvider>
      <CheckinStamp animate={false} onPlayed={played} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Check-in saved')).toBeTruthy();
  expect(played).not.toHaveBeenCalled();
});
