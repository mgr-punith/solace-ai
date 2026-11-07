import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { router, useGlobalSearchParams, usePathname, useRootNavigationState } from 'expo-router';
import { useAuth } from '../auth/context';
import { useOnboarding } from '../onboarding/context';
import { observeNotificationTaps } from '../../lib/notifications';
import { notificationTarget, parseReminderTarget } from './navigation';
import { reminderApi } from './api';
import { reminderManager } from './runtime';

export function ReminderProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.session?.user.id ?? null;
  const request = auth.request;
  useEffect(() => {
    if (auth.status !== 'signedIn' && auth.status !== 'signedOut') return;
    void reminderManager
      .bindUser(
        auth.status === 'signedIn' ? userId : null,
        auth.status === 'signedIn'
          ? {
              get: () => request((token) => reminderApi.get(token)),
              save: (settings) => request((token) => reminderApi.save(token, settings)),
            }
          : null,
      )
      .catch(() => {});
  }, [auth.status, userId, request]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reminderManager.refresh();
    });
    return () => subscription.remove();
  }, []);
  useEffect(
    () =>
      observeNotificationTaps((data) => {
        const target = parseReminderTarget(data);
        if (target) notificationTarget.set(target);
      }),
    [],
  );
  return children;
}
export function useReminders() {
  const state = useSyncExternalStore(
    reminderManager.subscribe,
    reminderManager.getSnapshot,
    reminderManager.getSnapshot,
  );
  return { ...state, save: reminderManager.save, refresh: reminderManager.refresh };
}
export function NotificationNavigation() {
  const auth = useAuth();
  const onboarding = useOnboarding();
  const navigation = useRootNavigationState();
  const pathname = usePathname();
  const { type } = useGlobalSearchParams<{ type?: string }>();
  const requested = useRef<string | null>(null);
  const target = useSyncExternalStore(
    notificationTarget.subscribe,
    notificationTarget.getSnapshot,
    notificationTarget.getSnapshot,
  );
  useEffect(() => {
    if (!target) {
      requested.current = null;
      return;
    }
    if (
      !navigation?.key ||
      auth.status !== 'signedIn' ||
      !onboarding.identityReady ||
      onboarding.needsIntroduction ||
      onboarding.needsChoice
    )
      return;
    const destination = pathname === '/reminder' ? `${pathname}?type=${type}` : pathname;
    if (destination === target) {
      // Keep the target available to EntryScreen until navigation actually commits.
      notificationTarget.set(null);
      return;
    }
    if (requested.current === target) return;
    // Defer until protected routes and the entry redirect have committed.
    const timer = setTimeout(() => {
      requested.current = target;
      router.replace(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    target,
    navigation?.key,
    pathname,
    type,
    auth.status,
    onboarding.identityReady,
    onboarding.needsIntroduction,
    onboarding.needsChoice,
  ]);
  return null;
}
