import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { MoodForm } from '../MoodForm';
import { moodApi } from '../api';
import type { MoodCheckin } from '@solace/shared';

jest.mock('../api', () => ({ moodApi: { save: jest.fn() } }));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: 'a' } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('test-token'),
  }),
}));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
const saved: MoodCheckin = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  mood: 2,
  tags: ['Tired'],
  note: 'A long day',
  timezone: 'UTC',
  createdAt: '2026-11-06T12:00:00Z',
};
const onSaved = jest.fn();
beforeEach(() => {
  jest.mocked(moodApi.save).mockResolvedValue(saved);
});
async function mount() {
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false, gcTime: 0 },
          },
        })
      }
    >
      <ThemeProvider>
        <MoodForm onMood={jest.fn()} onSaved={onSaved} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
it('does not save on mood selection and sends optional details only with explicit save', async () => {
  await mount();
  expect(
    screen.getByRole('button', { name: 'Save check-in' }).props.accessibilityState.disabled,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Low, 2 of 5' }));
  expect(moodApi.save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Add a note or feelings' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tired' }));
  await fireEvent.changeText(screen.getByLabelText('Optional check-in note'), 'A long day');
  await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));
  expect(moodApi.save).toHaveBeenCalledWith(
    'test-token',
    expect.objectContaining({ mood: 2, tags: ['Tired'], note: 'A long day' }),
  );
  expect(onSaved).toHaveBeenCalledWith(saved);
});
it('preserves input on failure, does not claim success, and retries the identical request', async () => {
  jest.mocked(moodApi.save).mockRejectedValueOnce(new Error('Connection interrupted'));
  await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Low, 2 of 5' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add a note or feelings' }));
  await fireEvent.changeText(screen.getByLabelText('Optional check-in note'), 'Keep these words');
  await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Optional check-in note').props.value).toBe('Keep these words');
  const first = jest.mocked(moodApi.save).mock.calls[0]?.[1];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving check-in' }));
  expect(jest.mocked(moodApi.save).mock.calls[1]?.[1]).toEqual(first);
  expect(onSaved).toHaveBeenCalledTimes(1);
});
