import { expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import { useMotionPreferences } from '../useMotionPreferences';

it('follows motion and foreground changes, then removes its subscriptions', async () => {
  const read = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const removeMotion = jest.fn();
  const removeApp = jest.fn();
  const motion = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: removeMotion });
  const app = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeApp });
  const { result, unmount } = await renderHook(useMotionPreferences);
  expect(result.current.reduceMotion).toBe(false);
  await act(() => {
    motion.mock.calls[0]?.[1](true);
  });
  expect(result.current.reduceMotion).toBe(true);
  await act(() => {
    app.mock.calls[0]?.[1]('background');
  });
  expect(result.current.active).toBe(false);
  await act(() => {
    app.mock.calls[0]?.[1]('active');
  });
  expect(result.current.active).toBe(true);
  await unmount();
  expect(removeMotion).toHaveBeenCalledTimes(1);
  expect(removeApp).toHaveBeenCalledTimes(1);
  read.mockRestore();
  motion.mockRestore();
  app.mockRestore();
});
