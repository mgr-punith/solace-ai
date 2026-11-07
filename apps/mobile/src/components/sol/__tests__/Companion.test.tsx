import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Companion } from '../Companion';
import Sol from '../Sol';
import { gentleHaptic } from '../../../lib/haptics';
import { tokens } from '../../../theme/tokens';

let mockFocused = true;
let mockReduceMotion = false;
let mockHaptics = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({ active: true, reduceMotion: mockReduceMotion, haptics: mockHaptics }),
}));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('../Sol', () => ({ __esModule: true, default: jest.fn(() => null) }));
const drawing = () => jest.mocked(Sol).mock.calls.at(-1)?.[0];
beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  mockReduceMotion = false;
  mockHaptics = true;
});
afterEach(() => {
  jest.useRealTimers();
});

it('cycles visible reactions, replaces the expiry timer and returns to rest', async () => {
  const response = jest.fn();
  await render(<Companion onResponse={response} />);
  const button = screen.getByRole('button', { name: 'Say hello to Sol' });
  for (const reaction of ['wave', 'delight', 'wink']) {
    await fireEvent.press(button);
    expect(drawing()?.reaction).toBe(reaction);
    await act(async () => {
      jest.advanceTimersByTime(tokens.motion.response - 1);
    });
    expect(drawing()?.reaction).toBe(reaction);
  }
  expect(response).toHaveBeenLastCalledWith('No rush. Stay a little.');
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(drawing()?.reaction).toBeUndefined();
  expect(response).toHaveBeenLastCalledWith(null);
});

it('ends hold breathing on release or losing focus and keeps reduced-motion responses', async () => {
  mockReduceMotion = true;
  mockHaptics = false;
  const response = jest.fn();
  const view = await render(<Companion mood={0} onResponse={response} />);
  const button = screen.getByRole('button', { name: 'Say hello to Sol' });
  expect(response).toHaveBeenLastCalledWith('You can take this moment at your own pace.');
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'longPress');
  expect(drawing()).toMatchObject({ state: 'breathing', reduceMotion: true, pressed: false });
  expect(response).toHaveBeenLastCalledWith('Breathe at your own pace.');
  expect(gentleHaptic).toHaveBeenLastCalledWith(false);
  await fireEvent(button, 'pressOut');
  expect(drawing()?.state).toBe('idle');
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'longPress');
  mockFocused = false;
  await view.rerender(<Companion onResponse={response} />);
  expect(drawing()).toMatchObject({ state: 'idle', pressed: false, active: false });
  mockFocused = true;
  await view.rerender(<Companion onResponse={response} />);
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'pressOut');
  await fireEvent.press(button);
  expect(drawing()).toMatchObject({ reaction: 'wave', reduceMotion: true });
  await view.unmount();
  response.mockClear();
  await act(async () => {
    jest.advanceTimersByTime(tokens.motion.response);
  });
  expect(response).not.toHaveBeenCalled();
});
