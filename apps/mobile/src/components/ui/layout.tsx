import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { AppText } from './primitives';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: sky.surface,
          opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
}) {
  const { sky } = useTheme();
  return (
    <View style={[styles.heading, { backgroundColor: sky.surface }]}>
      {back && <IconButton icon="back" label="Go back" onPress={back} />}
      <View style={styles.grow}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="bodySmall" tone="secondary">
            {subtitle}
          </AppText>
        )}
      </View>
    </View>
  );
}
export function NavigationRow({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: sky.palette.secondary,
          opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: sky.palette.background }]}>
        <Icon name={icon} color={destructive ? sky.palette.error : sky.palette.text} />
      </View>
      <View style={styles.grow}>
        <AppText variant="body" tone={destructive ? 'error' : 'text'}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        )}
      </View>
      <Icon name="chevron" size={tokens.icon.sm} color={sky.palette.secondary} />
    </Pressable>
  );
}
export const layoutStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  grow: { flex: 1 },
  centered: { alignItems: 'center', gap: tokens.spacing.md },
  gap: { gap: tokens.spacing.md },
});
const styles = StyleSheet.create({
  grow: { flex: 1, gap: tokens.spacing.xs },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    borderRadius: tokens.radius.tag,
    padding: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    minHeight: tokens.target,
    paddingVertical: tokens.spacing.smd,
  },
  rowIcon: {
    width: tokens.target,
    height: tokens.target,
    borderRadius: tokens.radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    minHeight: tokens.target,
    minWidth: tokens.target,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
