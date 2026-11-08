import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export function CheckinStamp({ animate, onPlayed }: { animate: boolean; onPlayed: () => void }) {
  const { reduceMotion, active } = useTheme();
  const focused = useIsFocused();
  const fresh = useRef(animate);
  const played = useRef(onPlayed);
  played.current = onPlayed;
  const progress = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(progress);
    if (fresh.current) {
      fresh.current = false;
      // Consume the event even when motion is disabled, so revisiting never replays it.
      played.current();
      if (!reduceMotion && active && focused) {
        progress.value = 0;
        progress.value = withTiming(1, { duration: tokens.motion.calm });
      } else progress.value = 1;
    } else progress.value = 1;
    return () => cancelAnimation(progress);
  }, [reduceMotion, active, focused, progress]);
  const motion = useAnimatedStyle(() => ({
    opacity: 0.7 + 0.3 * progress.value,
    transform: [{ scale: 0.96 + 0.04 * progress.value }],
  }));
  return (
    <Animated.View style={[styles.stamp, motion]} accessibilityLiveRegion="polite">
      <Icon name="check" size={tokens.icon.sm} color={tokens.colors.face} />
      <AppText variant="caption" style={{ color: tokens.colors.face }}>
        Check-in saved
      </AppText>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.lantern,
  },
});
