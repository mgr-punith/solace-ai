import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { useMotionPreferences } from '../lib/useMotionPreferences';
import { skyAtMinute, type Appearance } from './sky';

function useThemeState() {
  const [now, setNow] = useState(() => new Date());
  const [appearance, setAppearance] = useState<Appearance>('auto');
  const [previewMinute, setPreviewMinute] = useState<number | null>(null);
  const [staticPreview, setStaticPreview] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const motion = useMotionPreferences();
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
  useEffect(() => {
    if (!motion.active) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [motion.active]);
  const minute = previewMinute ?? now.getHours() * 60 + now.getMinutes();
  const sky = useMemo(() => skyAtMinute(minute, appearance), [minute, appearance]);
  return {
    now,
    minute,
    sky,
    appearance,
    setAppearance,
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
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required.');
  return value;
}
