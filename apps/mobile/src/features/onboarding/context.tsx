import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/context';
import { createOnboardingStore } from './store';
import { onboardingStorage } from './storage';

type Store = ReturnType<typeof createOnboardingStore>;
const Context = createContext<Store | null>(null);
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createOnboardingStore(onboardingStorage));
  const auth = useAuth();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const userId = auth.status === 'signedIn' ? (auth.session?.user.id ?? null) : null;
  useEffect(() => {
    void store.restore();
  }, [store]);
  useEffect(() => {
    if (state.status === 'ready' && (auth.status === 'signedIn' || auth.status === 'signedOut'))
      void store.bindUser(userId);
  }, [auth.status, userId, store, state.status]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useOnboarding() {
  const store = useContext(Context);
  if (!store) throw new Error('OnboardingProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? (auth.session?.user.id ?? null) : null;
  const identityReady =
    (auth.status === 'signedIn' || auth.status === 'signedOut') &&
    state.identityReady &&
    state.userId === userId;
  const choice = identityReady
    ? userId
      ? state.document.choices[userId]
      : state.document.pendingChoice
    : null;
  return {
    ...state,
    identityReady,
    choice,
    needsIntroduction: !state.document.completed,
    needsChoice: choice == null,
    restore: store.restore,
    setStep: store.setStep,
    complete: store.complete,
    bindUser: store.bindUser,
    removeAccount: store.removeAccount,
  };
}
