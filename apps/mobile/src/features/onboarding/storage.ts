import * as SecureStore from 'expo-secure-store';
import type { OnboardingStorage } from './store';

const key = 'solace.onboarding.v1';
export const onboardingStorage: OnboardingStorage = {
  read: () => SecureStore.getItemAsync(key),
  write: (value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
};
