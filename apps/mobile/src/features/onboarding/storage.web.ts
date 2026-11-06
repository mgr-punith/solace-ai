import type { OnboardingStorage } from './store';

// Browser review stores only intro progress and the optional preference, never auth credentials.
const key = 'solace.onboarding.v1';
export const onboardingStorage: OnboardingStorage = {
  read: async () => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  write: async (value) => {
    window.localStorage.setItem(key, value);
  },
};
