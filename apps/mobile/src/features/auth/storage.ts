import * as SecureStore from 'expo-secure-store';
import { authResponseSchema, type AuthResponse } from '@solace/shared';

export type SessionStorage = {
  read: () => Promise<AuthResponse | null>;
  write: (session: AuthResponse) => Promise<void>;
  clear: () => Promise<void>;
};
const key = 'solace.auth.session.v1';
export const sessionStorage: SessionStorage = {
  async read() {
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) return null;
    let value: unknown;
    try {
      value = JSON.parse(stored);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
    const parsed = authResponseSchema.safeParse(value);
    if (!parsed.success) {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
    return parsed.data;
  },
  async write(session) {
    // One item keeps the access and rotating refresh token together on disk.
    await SecureStore.setItemAsync(key, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async clear() {
    await SecureStore.deleteItemAsync(key);
  },
};
