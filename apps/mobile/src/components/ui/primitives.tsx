import { Pressable, StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export function AppText({
  variant = 'body',
  tone = 'text',
  style,
  ...props
}: TextProps & { variant?: keyof typeof tokens.type; tone?: 'text' | 'secondary' | 'error' }) {
  const { sky, fontsLoaded } = useTheme();
  return (
    <Text
      {...props}
      style={[
        tokens.type[variant],
        !fontsLoaded && { fontFamily: undefined },
        { color: sky.palette[tone], flexShrink: 1 },
        style,
      ]}
    />
  );
}
export function Surface({ style, ...props }: ViewProps) {
  const { sky } = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.surface,
        { backgroundColor: sky.surface, borderColor: sky.palette.background },
        style,
      ]}
    />
  );
}
export function Action({
  children,
  onPress,
  selected = false,
  secondary = false,
  disabled = false,
  label,
  icon,
}: {
  children: string;
  onPress: () => void;
  selected?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  label?: string;
  icon?: IconName;
}) {
  const { sky, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? children}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(reduceMotion ? 1 : 0.98, { duration: tokens.motion.press });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: tokens.motion.quick });
        }}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: secondary && !selected ? sky.surface : tokens.action.background,
            borderColor: selected ? sky.palette.text : tokens.colors.clear,
            opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
          },
        ]}
      >
        {icon && (
          <Icon
            name={icon}
            size={tokens.icon.sm}
            color={secondary && !selected ? sky.palette.text : tokens.action.text}
          />
        )}
        <AppText
          variant="button"
          style={{
            color: secondary && !selected ? sky.palette.text : tokens.action.text,
            textAlign: 'center',
          }}
        >
          {children}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  surface: {
    padding: tokens.spacing.ml,
    borderRadius: tokens.radius.surface,
    borderWidth: tokens.border,
    gap: tokens.spacing.md,
  },
  action: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    minHeight: tokens.target,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.smd,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.selectedBorder,
  },
});
