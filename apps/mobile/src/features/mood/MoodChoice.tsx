import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  faceSize,
  onPress,
}: {
  index: number;
  selected: boolean;
  disabled: boolean;
  faceSize: number;
  onPress: () => void;
}) {
  const { sky, reduceMotion, active } = useTheme();
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    cancelAnimation(lift);
    lift.value =
      reduceMotion || !active ? 0 : withTiming(selected ? 1 : 0, { duration: tokens.motion.quick });
    return () => cancelAnimation(lift);
  }, [selected, active, reduceMotion, lift]);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.08 * lift.value }],
  }));
  const mood = moods[index]!;
  return (
    <View style={styles.slot}>
      {selected && (
        <View
          aria-hidden
          style={[
            styles.depth,
            { backgroundColor: sky.night ? '#426E68' : tokens.action.background },
          ]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mood.label}, ${index + 1} of 5`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.choice,
          {
            backgroundColor: selected
              ? sky.night
                ? '#233943'
                : sky.palette.background
              : tokens.colors.clear,
            transform: [{ translateY: selected && !pressed ? -tokens.spacing.xs : 0 }],
            opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
          },
        ]}
      >
        <Animated.View style={faceStyle}>
          <MoodFace mood={index} size={faceSize} />
        </Animated.View>
        <AppText
          variant="caption"
          numberOfLines={1}
          style={{ color: sky.palette.text, textAlign: 'center' }}
        >
          {mood.label}
        </AppText>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  slot: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.target + tokens.spacing.ml,
    justifyContent: 'flex-end',
  },
  depth: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: tokens.spacing.xs,
    bottom: 0,
    borderRadius: tokens.radius.tag,
  },
  choice: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.tag,
    minHeight: tokens.target + tokens.spacing.sm,
  },
});
