import type { AppearanceStorage } from './appearance';

// Only the display preference is stored in the browser, never account data.
const key = 'solace.appearance.v1';
export const appearanceStorage: AppearanceStorage = {
  read: async () => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  write: async (value) => {
    window.localStorage.setItem(key, value);
  },
};
