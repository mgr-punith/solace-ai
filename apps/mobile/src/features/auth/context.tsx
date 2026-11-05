import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAuthApi } from './api';
import { googleSignIn } from './google';
import { createSessionManager, type SessionManager } from './session';
import { sessionStorage } from './storage';

const AuthContext = createContext<SessionManager | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [manager] = useState(() =>
    createSessionManager({
      api: createAuthApi(process.env.EXPO_PUBLIC_API_URL),
      storage: sessionStorage,
      google: googleSignIn,
    }),
  );
  useEffect(() => {
    let previousUser: string | null = null;
    const unsubscribe = manager.subscribe(() => {
      const id = manager.getSnapshot().session?.user.id ?? null;
      if (id !== previousUser) {
        client.clear();
        previousUser = id;
      }
    });
    void manager.restore();
    return unsubscribe;
  }, [client, manager]);
  return <AuthContext.Provider value={manager}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const manager = useContext(AuthContext);
  if (!manager) throw new Error('AuthProvider is required.');
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  return {
    ...state,
    restore: manager.restore,
    signIn: manager.signIn,
    logout: manager.logout,
    deleteAccount: manager.deleteAccount,
  };
}
