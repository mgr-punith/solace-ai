import type { SessionStorage } from './storage';

// Browser preview stays signed out. Never move native authentication tokens into web storage.
export const sessionStorage: SessionStorage = {
  read: async () => null,
  write: async () => {
    throw new Error('Sign in using the Android app.');
  },
  clear: async () => {},
};
