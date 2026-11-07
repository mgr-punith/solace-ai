import { afterEach, expect, it, jest } from '@jest/globals';
import type { EffectCallback } from 'react';
import { BackHandler } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useScreenBack, useTabBack } from '../useScreenBack';

let mockPathname = '/you';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: (effect: EffectCallback) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
afterEach(() => {
  jest.restoreAllMocks();
});

it('keeps Android Back in tab history and only permits exit from Home with no history', async () => {
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    back = handler;
    return { remove: jest.fn() };
  });
  const event = { type: 'hardwareBackPress', timeStamp: 1 };
  mockPathname = '/you';
  jest.mocked(router.canGoBack).mockReturnValue(true);
  const hook = await renderHook(() => useTabBack());
  await act(async () => {
    expect(back?.(event)).toBe(true);
  });
  expect(router.back).toHaveBeenCalledTimes(1);
  jest.mocked(router.canGoBack).mockReturnValue(false);
  await act(async () => {
    expect(back?.(event)).toBe(true);
  });
  expect(router.replace).toHaveBeenCalledWith('/home');
  mockPathname = '/home';
  await hook.rerender(undefined);
  await act(async () => {
    expect(back?.(event)).toBe(false);
  });
});

it('uses route history for the header and Android Back, with a parent for direct entry', async () => {
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    back = handler;
    return { remove };
  });
  jest.mocked(router.canGoBack).mockReturnValue(true);
  const hook = await renderHook(() => useScreenBack('/wellness'));
  await act(async () => hook.result.current());
  expect(router.back).toHaveBeenCalledTimes(1);
  await act(async () => {
    expect(back?.({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(true);
  });
  expect(router.back).toHaveBeenCalledTimes(2);
  expect(router.replace).not.toHaveBeenCalled();
  jest.mocked(router.canGoBack).mockReturnValue(false);
  await act(async () => {
    expect(back?.({ type: 'hardwareBackPress', timeStamp: 2 })).toBe(true);
  });
  expect(router.replace).toHaveBeenCalledWith('/wellness');
  await hook.unmount();
  expect(remove).toHaveBeenCalled();
});
