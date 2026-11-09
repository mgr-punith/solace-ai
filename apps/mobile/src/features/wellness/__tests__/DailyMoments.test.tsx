import { expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { DailyMoments } from '../DailyMoments';
import { ThemeProvider } from '../../../theme/ThemeProvider';

jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));

it('counts saved moments once, supports either order, and clears a previous day', async () => {
  const daily = {
    day: '2026-11-09',
    timezone: 'Asia/Kolkata',
    checkedIn: false,
    breathingSessions: 0,
    readAffirmationIds: [] as string[],
  };
  const tree = () => (
    <ThemeProvider>
      <DailyMoments daily={{ ...daily }} />
    </ThemeProvider>
  );
  const app = await render(tree());
  const progress = () => screen.getByRole('progressbar', { name: 'Daily moments' });
  expect(progress().props.accessibilityValue.now).toBe(0);

  daily.readAffirmationIds = ['today'];
  await app.rerender(tree());
  expect(progress().props.accessibilityValue).toMatchObject({
    now: 1,
    text: 'Check in: optional. Breathe or read: saved',
  });
  daily.breathingSessions = 8;
  await app.rerender(tree());
  expect(progress().props.accessibilityValue.now).toBe(1);

  daily.checkedIn = true;
  await app.rerender(tree());
  expect(progress().props.accessibilityValue.now).toBe(2);
  expect(screen.getByText('Both moments saved. Come back when you want to.')).toBeTruthy();

  daily.day = '2026-11-10';
  daily.checkedIn = false;
  daily.breathingSessions = 0;
  daily.readAffirmationIds = [];
  await app.rerender(tree());
  expect(progress().props.accessibilityValue.now).toBe(0);
  expect(screen.queryByText('Both moments saved. Come back when you want to.')).toBeNull();
});
