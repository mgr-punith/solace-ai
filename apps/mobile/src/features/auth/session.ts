import type { AuthResponse } from '@solace/shared';
import { AuthApiError, type AuthApi } from './api';
import type { SessionStorage } from './storage';
import type { GoogleSignIn } from './google';

type AuthState = {
  status: 'restoring' | 'signedOut' | 'signedIn' | 'error';
  session: AuthResponse | null;
  busy: boolean;
  error: string | null;
};
export function createSessionManager({
  api,
  storage,
  google,
  now = Date.now,
  beforeClear,
}: {
  api: AuthApi;
  storage: SessionStorage;
  google: GoogleSignIn;
  now?: () => number;
  beforeClear?: (intentional: boolean) => Promise<void>;
}) {
  let state: AuthState = { status: 'restoring', session: null, busy: false, error: null };
  const listeners = new Set<() => void>();
  let queue = Promise.resolve();
  const update = (changes: Partial<AuthState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  };
  async function clear(intentional = false) {
    await beforeClear?.(intentional);
    await storage.clear();
    await google.signOut().catch(() => {});
    update({ status: 'signedOut', session: null, error: null });
  }
  async function save(session: AuthResponse) {
    try {
      await storage.write(session);
    } catch {
      // A rotated token must not leave an old refresh token on disk.
      await api.logout(session.refreshToken).catch(() => {});
      await clear();
      throw new Error('Your session could not be saved securely. Try signing in again.');
    }
    update({ session });
  }
  async function validSession(forceRefresh = false) {
    let session = state.session;
    if (!session) throw new AuthApiError(401, 'SESSION_EXPIRED', 'Sign in to continue.');
    if (forceRefresh || Date.parse(session.accessTokenExpiresAt) <= now() + 30_000) {
      session = await api.refresh(session.refreshToken);
      await save(session);
    }
    return session;
  }
  async function authenticated<T>(action: (token: string) => Promise<T>) {
    const session = await validSession();
    try {
      return await action(session.accessToken);
    } catch (error) {
      if (!(error instanceof AuthApiError) || error.status !== 401) throw error;
      return action((await validSession(true)).accessToken);
    }
  }
  function run(operation: () => Promise<void>) {
    const result = queue.then(async () => {
      update({ busy: true, error: null });
      try {
        await operation();
      } catch (error) {
        if (error instanceof AuthApiError && error.status === 401) {
          await clear();
          update({ error: 'Your session has ended. Sign in again.' });
        } else {
          update({
            error: error instanceof Error ? error.message : 'Something went wrong. Try again.',
          });
          if (state.status === 'restoring') update({ status: 'error' });
        }
      } finally {
        update({ busy: false });
      }
    });
    queue = result.catch(() => {});
    return result;
  }
  const restore = () =>
    run(async () => {
      update({ status: 'restoring' });
      const stored = await storage.read();
      if (!stored) {
        update({ status: 'signedOut', session: null });
        return;
      }
      update({ session: stored });
      const person = await authenticated(api.me);
      update({ status: 'signedIn', session: { ...state.session!, user: person } });
    });
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore,
    request: <T>(action: (token: string) => Promise<T>): Promise<T> => {
      const expectedUser = state.session?.user.id;
      const result = queue.then(async () => {
        if (!expectedUser || state.status !== 'signedIn' || state.session?.user.id !== expectedUser)
          throw new AuthApiError(401, 'SESSION_EXPIRED', 'Sign in to continue.');
        try {
          return await authenticated(action);
        } catch (error) {
          if (error instanceof AuthApiError && error.status === 401) {
            await clear();
            update({ error: 'Your session has ended. Sign in again.' });
          }
          throw error;
        }
      });
      // Share the session queue so concurrent queries cannot replay a rotating refresh token.
      queue = result.then(
        () => {},
        () => {},
      );
      return result;
    },
    signIn: () =>
      run(async () => {
        const idToken = await google.signIn();
        if (!idToken) {
          update({ status: 'signedOut' });
          return;
        }
        await save(await api.google(idToken));
        update({ status: 'signedIn' });
      }),
    logout: () =>
      run(async () => {
        if (state.session) await api.logout(state.session.refreshToken);
        await clear(true);
      }),
    deleteAccount: (beforeDelete?: () => Promise<void>) =>
      run(async () => {
        // Clear device-owned preferences before deleting their owning account.
        await beforeDelete?.();
        await authenticated(api.deleteAccount);
        await clear(true);
      }),
  };
}
export type SessionManager = ReturnType<typeof createSessionManager>;
