import { expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { defaultReminders } from '@solace/shared';
import { RemindersScreen } from '../RemindersScreen';
import { useReminders } from '../context';
import { requestNotificationPermission } from '../../../lib/notifications';
import { ThemeProvider } from '../../../theme/ThemeProvider';
jest.mock('../context', () => ({ useReminders: jest.fn() }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../../../lib/notifications', () => ({ requestNotificationPermission: jest.fn() }));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
const save = jest.fn<ReturnType<typeof useReminders>['save']>().mockResolvedValue(true);
const refresh = jest.fn<ReturnType<typeof useReminders>['refresh']>().mockResolvedValue(undefined);
const state: ReturnType<typeof useReminders> = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  settings: defaultReminders(),
  status: 'ready',
  busy: false,
  pending: false,
  error: null,
  scheduleError: null,
  permission: 'undetermined',
  count: 0,
  save,
  refresh,
};
beforeEach(() => {
  jest.mocked(useReminders).mockReturnValue(state);
});
jest.setTimeout(15000);
const open = () =>
  render(
    <ThemeProvider>
      <RemindersScreen />
    </ThemeProvider>,
  );
it('does not prompt on opening; enabling a reminder is an explicit save with time and days', async () => {
  await open();
  expect(requestNotificationPermission).not.toHaveBeenCalled();
  expect(screen.getByText('No reminders are on. Choose one below if it would help.')).toBeTruthy();
  await fireEvent(screen.getByLabelText('Enable Mood check-in'), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText('Mood check-in time (24-hour)'), '18:30');
  await fireEvent.press(screen.getByRole('button', { name: 'Mood check-in Sun' }));
  expect(save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save reminders' }));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      reminders: expect.arrayContaining([
        expect.objectContaining({
          type: 'mood',
          enabled: true,
          time: '18:30',
          days: [2, 3, 4, 5, 6, 7],
        }),
      ]),
    }),
  );
  expect(requestNotificationPermission).not.toHaveBeenCalled();
});
it('rejects invalid times without losing input and requests permissions only after the explanation', async () => {
  jest.mocked(requestNotificationPermission).mockResolvedValue('granted');
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Allow notifications' }));
  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByLabelText('Enable Mood check-in'), 'valueChange', true);
  await fireEvent.changeText(screen.getByLabelText('Mood check-in time (24-hour)'), '25:00');
  await fireEvent.press(screen.getByRole('button', { name: 'Save reminders' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('25:00')).toBeTruthy();
  expect(screen.getByRole('alert')).toBeTruthy();
});
it('makes sync failures, permission denial and retry visible', async () => {
  jest.mocked(useReminders).mockReturnValue({
    ...state,
    pending: true,
    permission: 'denied',
    error: 'Account sync could not finish.',
  });
  await open();
  expect(screen.getByText('Saved on this phone. Account sync is pending.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Open phone settings' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry account sync' }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
