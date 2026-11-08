import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useMotionPreferences } from '../../../lib/useMotionPreferences';
import { gentleHaptic } from '../../../lib/haptics';
import { DesignPreviewScreen } from '../DesignPreviewScreen';

jest.mock('../../../components/sol/Sol', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('../../../lib/useMotionPreferences', () => ({ useMotionPreferences: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('../../auth/context', () => ({
  useAuth: () => ({ session: { user: { name: 'Maya Patel' } } }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true },
  useFocusEffect: (callback: () => void) => {
    // The Router focus hook follows effect lifecycle for this focused-screen test.
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));

beforeEach(() => {
  jest.mocked(useMotionPreferences).mockReturnValue({ active: true, reduceMotion: false });
});

it('keeps mood selection local and labels it as an unsaved preview', async () => {
  await render(
    <ThemeProvider>
      <DesignPreviewScreen />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Heavy, 1 of 5' }));
  expect(
    screen.getByRole('button', { name: 'Heavy, 1 of 5' }).props.accessibilityState.selected,
  ).toBe(true);
  expect(screen.getByText('Sounds like a rough day. Want to talk?')).toBeTruthy();
  expect(screen.getByText('Preview only · This mood isn’t saved.')).toBeTruthy();
});

it('honors system Reduce Motion during breathing and lets the pause end', async () => {
  jest.mocked(useMotionPreferences).mockReturnValue({ active: true, reduceMotion: true });
  await render(
    <ThemeProvider>
      <DesignPreviewScreen />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Take a slow breath' }));
  expect(screen.getByText('Breathe at your own pace.')).toBeTruthy();
  expect(screen.queryByText('Breathe in.')).toBeNull();
  expect(screen.getByLabelText('Reduce Motion').props.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish this pause' }));
  expect(screen.queryByText('Breathe at your own pace.')).toBeNull();
});

it('passes the haptics preference through when the companion is tapped', async () => {
  await render(
    <ThemeProvider>
      <DesignPreviewScreen />
    </ThemeProvider>,
  );
  await fireEvent(screen.getByLabelText('Haptics'), 'valueChange', false);
  await fireEvent.press(screen.getByRole('button', { name: 'Say hello to Sol' }));
  expect(gentleHaptic).toHaveBeenLastCalledWith(false);
});
