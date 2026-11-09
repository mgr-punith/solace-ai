import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { useMotionPreferences } from '../lib/useMotionPreferences';
import { skyAtMinute, type Appearance } from './sky';
import { createAppearanceStore, type AppearanceStorage } from './appearance';
import { appearanceStorage } from './appearanceStorage';
import { useLayoutMetrics } from './layout';

function useThemeState(storage: AppearanceStorage) {
  const [now, setNow] = useState(() => new Date());
  const [store] = useState(() => createAppearanceStore(storage));
  const preference = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [previewAppearance, setPreviewAppearance] = useState<Appearance | null>(null);
  const [previewMinute, setPreviewMinute] = useState<number | null>(null);
  const [staticPreview, setStaticPreview] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const motion = useMotionPreferences();
  const { compact } = useLayoutMetrics();
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
  useEffect(() => {
    void store.restore();
  }, [store]);
  useEffect(() => {
    if (!motion.active) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [motion.active]);
  const minute = previewMinute ?? now.getHours() * 60 + now.getMinutes();
  const appearance = previewAppearance ?? preference.appearance;
  const sky = useMemo(() => skyAtMinute(minute, appearance), [minute, appearance]);
  return {
    now,
    minute,
    sky,
    compact,
    appearance: preference.appearance,
    appearanceReady: preference.status !== 'loading',
    appearanceBusy: preference.busy,
    appearanceError: preference.error,
    appearanceStatus: preference.status,
    setAppearance: store.select,
    retryAppearance: store.retry,
    previewAppearance,
    setPreviewAppearance,
    previewMinute,
    setPreviewMinute,
    staticPreview,
    setStaticPreview,
    haptics,
    setHaptics,
    active: motion.active,
    systemReduceMotion: motion.reduceMotion,
    reduceMotion: motion.reduceMotion || staticPreview,
    fontsLoaded,
    fontError,
  };
}

const ThemeContext = createContext<ReturnType<typeof useThemeState> | null>(null);
export function ThemeProvider({
  children,
  storage = appearanceStorage,
}: {
  children: ReactNode;
  storage?: AppearanceStorage;
}) {
  const value = useThemeState(storage);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required.');
  return value;
}
