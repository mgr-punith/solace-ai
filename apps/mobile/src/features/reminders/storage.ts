import * as SecureStore from 'expo-secure-store';
const key = 'solace.reminders.v1';
export const reminderStorage = {
  read: () => SecureStore.getItemAsync(key),
  write: (value: string) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  clear: () => SecureStore.deleteItemAsync(key),
};
