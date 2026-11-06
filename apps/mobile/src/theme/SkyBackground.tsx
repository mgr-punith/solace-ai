import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { tokens } from './tokens';

// The top layer fades in over the previous sky, without remounting on navigation.
export function SkyBackground() {
  const { sky, reduceMotion } = useTheme();
  const last = useRef(sky);
  const [previous, setPrevious] = useState(sky);
  const opacity = useSharedValue(1);
  useEffect(() => {
    setPrevious(last.current);
    last.current = sky;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: reduceMotion ? 0 : tokens.motion.slow });
  }, [sky, reduceMotion, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient colors={[previous.top, previous.bottom]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <LinearGradient colors={[sky.top, sky.bottom]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </Animated.View>
  );
}
