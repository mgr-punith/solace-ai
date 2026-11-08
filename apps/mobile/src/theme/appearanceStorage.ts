import * as SecureStore from 'expo-secure-store';
import type { AppearanceStorage } from './appearance';

const key = 'solace.appearance.v1';
export const appearanceStorage: AppearanceStorage = {
  read: () => SecureStore.getItemAsync(key),
  write: (value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
};
