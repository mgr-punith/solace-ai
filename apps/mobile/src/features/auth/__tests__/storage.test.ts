import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { sessionStorage } from '../storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
}));
afterEach(() => {
  jest.resetAllMocks();
});
describe('native credential storage', () => {
  it('returns no session on a first launch and removes corrupt stored credentials', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('{invalid')
      .mockResolvedValueOnce(JSON.stringify({ accessToken: 'orphaned' }));
    expect(await sessionStorage.read()).toBeNull();
    expect(await sessionStorage.read()).toBeNull();
    expect(await sessionStorage.read()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
