import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { ChatBubble, ThinkingBubble } from '../ChatBubble';
import { useTheme } from '../../../theme/ThemeProvider';
import { skyAtMinute } from '../../../theme/sky';

jest.mock('../../../theme/ThemeProvider', () => ({ useTheme: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    withTiming: jest.fn(actual.withTiming),
    withRepeat: jest.fn(actual.withRepeat),
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({
    sky: skyAtMinute(1380),
    fontsLoaded: true,
    reduceMotion: false,
  } as ReturnType<typeof useTheme>);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('animates a new message once and keeps a recycled or reopened bubble still', async () => {
  const fresh = new Set(['new-message']);
  const claim = (key: string) => fresh.delete(key);
  const timing = jest.spyOn(Reanimated, 'withTiming');
  const bubble = (
    <ChatBubble motionActive entranceKey="new-message" claimEntrance={claim}>
      <Text>Keep my thought</Text>
    </ChatBubble>
  );
  const view = await render(bubble);
  expect(timing).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(250));
  await view.unmount();
  timing.mockClear();
  await render(bubble);
  expect(screen.getByText('Keep my thought')).toBeTruthy();
  expect(timing).not.toHaveBeenCalled();
});

it('keeps urgent replies immediate and does not animate historical rows', async () => {
  const timing = jest.spyOn(Reanimated, 'withTiming');
  const view = await render(
    <ChatBubble motionActive immediate entranceKey="urgent" claimEntrance={() => true}>
      <Text>Reach someone you trust</Text>
    </ChatBubble>,
  );
  expect(screen.getByText('Reach someone you trust')).toBeTruthy();
  expect(timing).not.toHaveBeenCalled();
  await view.rerender(
    <ChatBubble motionActive entranceKey="history" claimEntrance={() => false}>
      <Text>An earlier reply</Text>
    </ChatBubble>,
  );
  expect(timing).not.toHaveBeenCalled();
});

it('stops dot animation off-screen and preserves the accessible status with Reduce Motion', async () => {
  const repeat = jest.spyOn(Reanimated, 'withRepeat');
  const cancel = jest.spyOn(Reanimated, 'cancelAnimation');
  const view = await render(<ThinkingBubble motionActive />);
  expect(repeat).toHaveBeenCalledTimes(3);
  expect(screen.getByLabelText('Sol is thinking…')).toBeTruthy();
  repeat.mockClear();
  cancel.mockClear();
  await view.rerender(<ThinkingBubble motionActive={false} />);
  expect(cancel.mock.calls.length).toBeGreaterThanOrEqual(3);
  expect(repeat).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Sol is thinking…')).toBeTruthy();
  jest.mocked(useTheme).mockReturnValue({ ...useTheme(), reduceMotion: true });
  await view.rerender(<ThinkingBubble motionActive />);
  expect(repeat).not.toHaveBeenCalled();
  const timing = jest.spyOn(Reanimated, 'withTiming');
  timing.mockClear();
  await view.rerender(
    <ChatBubble motionActive entranceKey="new" claimEntrance={() => true}>
      <Text>A new reply without movement</Text>
    </ChatBubble>,
  );
  expect(timing).not.toHaveBeenCalled();
  expect(screen.getByText('A new reply without movement')).toBeTruthy();
});
