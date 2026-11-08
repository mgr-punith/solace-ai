import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MoodFace } from '../../components/ui/MoodFace';
import { AppText } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';

export function MoodChoice({
  index,
  selected,
  disabled,
  onPress,
}: {
  index: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { sky, reduceMotion, active } = useTheme();
  const { fontScale } = useWindowDimensions();
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    cancelAnimation(lift);
    lift.value =
      reduceMotion || !active ? 0 : withTiming(selected ? 1 : 0, { duration: tokens.motion.quick });
    return () => cancelAnimation(lift);
  }, [selected, active, reduceMotion, lift]);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -tokens.spacing.xs * lift.value }, { scale: 1 + 0.08 * lift.value }],
  }));
  const mood = moods[index]!;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mood.label}, ${index + 1} of 5`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.choice,
        {
          minWidth: tokens.moodChoiceWidth * fontScale,
          flex: fontScale <= 1.1 ? 1 : undefined,
          borderColor: selected ? sky.palette.text : tokens.colors.clear,
          backgroundColor: selected ? tokens.action.background : tokens.colors.clear,
        },
      ]}
    >
      <Animated.View style={faceStyle}>
        <MoodFace mood={index} />
      </Animated.View>
      <AppText variant="caption" style={selected ? { color: tokens.action.text } : undefined}>
        {mood.label}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  choice: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.smd,
    borderRadius: tokens.radius.tag,
    borderWidth: tokens.selectedBorder,
    minHeight: tokens.target,
  },
});
