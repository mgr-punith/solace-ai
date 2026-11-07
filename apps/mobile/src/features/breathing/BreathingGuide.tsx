import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BreathingPattern } from '@solace/shared';
import Sol from '../../components/sol/Sol';
import { AppText } from '../../components/ui/primitives';
import { layoutStyles } from '../../components/ui/layout';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { gentleHaptic } from '../../lib/haptics';
import { breathFrame, type Practice } from './timer';
export function BreathingGuide({
  pattern,
  practice,
}: {
  pattern: BreathingPattern;
  practice: Practice;
}) {
  const { reduceMotion, haptics } = useTheme();
  const frame = breathFrame(pattern, practice.elapsedMs);
  const scale = useSharedValue(frame.scale);
  const latestFrame = useRef(frame);
  latestFrame.current = frame;
  const running = practice.status === 'running';
  useEffect(() => {
    const frame = latestFrame.current;
    cancelAnimation(scale);
    scale.value = reduceMotion ? 1 : frame.scale;
    if (running && !reduceMotion)
      scale.value = withTiming(frame.targetScale, {
        duration: frame.remainingMs,
        easing: Easing.linear,
      });
    return () => cancelAnimation(scale);
  }, [frame.key, running, reduceMotion, scale]);
  useEffect(() => {
    if (running) void gentleHaptic(haptics);
  }, [frame.key, running, haptics]);
  const animation = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={layoutStyles.centered}>
      <Animated.View style={animation}>
        <Sol
          state="breathing"
          mood={2}
          active={false}
          reduceMotion
          greeting={0}
          size={tokens.sol.hero}
        />
      </Animated.View>
      <AppText variant="display" accessibilityLiveRegion="polite">
        {practice.status === 'paused'
          ? 'Take your time.'
          : practice.status === 'complete'
            ? 'A moment, just for you.'
            : frame.label}
      </AppText>
      <AppText variant="bodySmall" tone="secondary">
        {practice.status === 'paused'
          ? 'Resume whenever you’re ready.'
          : practice.status === 'complete'
            ? 'Let your breathing return to its own rhythm.'
            : `${Math.ceil(frame.remainingMs / 1000)} seconds · no need to force your breath`}
      </AppText>
      {reduceMotion && (
        <AppText variant="caption" tone="secondary">
          Still guide · follow the words at your own pace.
        </AppText>
      )}
    </View>
  );
}
