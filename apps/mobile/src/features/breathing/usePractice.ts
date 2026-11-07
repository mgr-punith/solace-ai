import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from 'expo-router';
import {
  advancePractice,
  createPractice,
  pausePractice,
  resumePractice,
  type Practice,
} from './timer';
export function usePractice() {
  const [practice, setPractice] = useState<Practice | null>(null);
  const current = useRef<Practice | null>(null);
  const focused = useIsFocused();
  const update = useCallback((next: Practice | null) => {
    current.current = next;
    setPractice(next);
  }, []);
  const pause = useCallback(() => {
    if (current.current) update(pausePractice(current.current, performance.now()));
  }, [update]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', pause) : null;
    return () => {
      sub.remove();
      blur?.remove();
    };
  }, [pause]);
  useEffect(() => {
    if (!focused) pause();
  }, [focused, pause]);
  const running = practice?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (current.current) update(advancePractice(current.current, performance.now()));
    }, 250);
    return () => clearInterval(timer);
  }, [running, update]);
  return {
    practice,
    pause,
    start: (seconds: number) => update(createPractice(seconds, performance.now())),
    resume: () => {
      if (current.current && focused && AppState.currentState === 'active')
        update(resumePractice(current.current, performance.now()));
    },
    reset: () => update(null),
  };
}
