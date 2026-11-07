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
  return (
    <View style={styles.heading}>
      {back && <IconButton icon="back" label="Go back" onPress={back} />}
      <View style={styles.grow}>
        <AppText variant="title" accessibilityRole="header">
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
  label,
  subtitle,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: IconName;
  title: string;
  label?: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
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
    paddingVertical: tokens.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    minHeight: tokens.target,
    paddingVertical: tokens.spacing.sm,
  },
  rowIcon: {
    width: tokens.icon.lg + tokens.spacing.smd,
    height: tokens.icon.lg + tokens.spacing.smd,
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
