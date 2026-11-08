import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export type ClaimEntrance = (key: string) => boolean;

export function ChatBubble({
  children,
  isUser = false,
  motionActive,
  entranceKey,
  claimEntrance,
  immediate = false,
}: {
  children: ReactNode;
  isUser?: boolean;
  motionActive: boolean;
  entranceKey?: string;
  claimEntrance?: ClaimEntrance;
  immediate?: boolean;
}) {
  const { sky, reduceMotion } = useTheme();
  const progress = useSharedValue(1);
  useLayoutEffect(() => {
    const fresh = entranceKey && claimEntrance?.(entranceKey);
    cancelAnimation(progress);
    if (fresh && motionActive && !reduceMotion && !immediate) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: tokens.motion.quick,
        easing: Easing.out(Easing.cubic),
      });
    } else progress.value = 1;
    return () => cancelAnimation(progress);
  }, [claimEntrance, entranceKey, immediate, motionActive, progress, reduceMotion]);
  const entrance = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * tokens.spacing.sm }],
  }));
  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          maxWidth: isUser ? '92%' : '100%',
          backgroundColor: isUser
            ? tokens.action.background
            : sky.night
              ? tokens.chat.solNight
              : tokens.chat.solDay,
          borderBottomRightRadius: isUser ? tokens.spacing.xs : tokens.radius.surface,
          borderBottomLeftRadius: isUser ? tokens.radius.surface : tokens.spacing.xs,
        },
        entrance,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function ThinkingDot({ index, moving }: { index: number; moving: boolean }) {
  const { sky } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = 0;
    if (moving) {
      pulse.value = withDelay(
        index * tokens.motion.press,
        withRepeat(
          withTiming(1, { duration: tokens.motion.calm, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    }
    return () => cancelAnimation(pulse);
  }, [index, moving, pulse]);
  const animated = useAnimatedStyle(() => ({
    opacity: tokens.opacity.disabled + (1 - tokens.opacity.disabled) * pulse.value,
    transform: [{ translateY: -tokens.chat.dotLift * pulse.value }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: sky.palette.text }, animated]} />;
}

export function ThinkingBubble({ motionActive }: { motionActive: boolean }) {
  const { reduceMotion } = useTheme();
  return (
    <ChatBubble motionActive={motionActive}>
      <View
        accessible
        accessibilityLabel="Sol is thinking…"
        accessibilityLiveRegion="polite"
        style={styles.thinking}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.dots}
        >
          {[0, 1, 2].map((index) => (
            <ThinkingDot key={index} index={index} moving={motionActive && !reduceMotion} />
          ))}
        </View>
        <AppText variant="bodySmall" tone="secondary">
          Sol is thinking…
        </AppText>
      </View>
    </ChatBubble>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: tokens.radius.surface,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.smd,
    gap: tokens.spacing.xs,
  },
  thinking: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacing.smd,
  },
  dots: { flexDirection: 'row', gap: tokens.spacing.xs, paddingVertical: tokens.spacing.xs },
  dot: {
    width: tokens.chat.dotSize,
    height: tokens.chat.dotSize,
    borderRadius: tokens.radius.pill,
  },
});
