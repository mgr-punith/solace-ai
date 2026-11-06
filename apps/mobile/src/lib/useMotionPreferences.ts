import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useMotionPreferences() {
  // Stay still until the OS preference has been read.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    const read = () => {
      void AccessibilityInfo.isReduceMotionEnabled()
        .then((value) => {
          if (mounted) setReduceMotion(value);
        })
        .catch(() => {});
    };
    read();
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') read();
    });
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  return { reduceMotion, active };
}
