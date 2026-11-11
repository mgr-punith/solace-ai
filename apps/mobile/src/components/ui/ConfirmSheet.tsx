import { useEffect } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { AppText } from './primitives';

export type ConfirmSheetState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  icon?: IconName;
};

export function ConfirmSheet({
  state,
  onDismiss,
  pending = false,
}: {
  state: ConfirmSheetState | null;
  onDismiss: () => void;
  pending?: boolean;
}) {
  const { sky, reduceMotion } = useTheme();
  const { height } = useWindowDimensions();
  const visible = state !== null;

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) onDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [onDismiss, pending, visible]);

  if (!state) return null;
  const iconColor = state.destructive ? sky.palette.error : sky.palette.text;
  return (
    <Modal
      animationType="none"
      transparent
      visible
      statusBarTranslucent
      onRequestClose={() => {
        if (!pending) onDismiss();
      }}
    >
      <View
        style={styles.root}
        accessibilityViewIsModal
        onAccessibilityEscape={() => {
          if (!pending) onDismiss();
        }}
      >
        <Animated.View
          {...(!reduceMotion && {
            entering: FadeIn.duration(tokens.motion.quick),
            exiting: FadeOut.duration(tokens.motion.quick),
          })}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            accessibilityLabel="Close confirmation"
            accessibilityRole="button"
            disabled={pending}
            onPress={onDismiss}
            style={styles.scrim}
          />
        </Animated.View>
        <Animated.View
          accessibilityLabel={state.title}
          {...(!reduceMotion && {
            entering: ZoomIn.duration(tokens.motion.calm),
            exiting: ZoomOut.duration(tokens.motion.quick),
          })}
          style={[
            styles.sheet,
            {
              backgroundColor: sky.surface,
              borderColor: sky.outline,
              maxHeight: height - tokens.spacing.hero,
              paddingBottom: tokens.spacing.lg,
            },
          ]}
        >
          <View style={styles.headingRow}>
            <View style={[styles.icon, { backgroundColor: sky.palette.background }]}>
              <Icon
                name={state.icon ?? (state.destructive ? 'delete' : 'sparkles')}
                color={iconColor}
              />
            </View>
            <View style={styles.copy}>
              <AppText variant="sheetTitle" accessibilityRole="header">
                {state.title}
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                {state.message}
              </AppText>
            </View>
          </View>
          <View style={styles.actions}>
            <SheetAction label={state.cancelLabel} onPress={onDismiss} disabled={pending} />
            <SheetAction
              label={state.confirmLabel}
              onPress={state.onConfirm}
              disabled={pending}
              {...(state.destructive !== undefined && { destructive: state.destructive })}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SheetAction({
  label,
  onPress,
  disabled,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  destructive?: boolean;
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
        styles.action,
        {
          backgroundColor: destructive ? sky.palette.error : sky.palette.background,
          borderColor: destructive ? sky.palette.error : sky.outline,
          opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <AppText
        variant="buttonSmall"
        style={{
          color: destructive
            ? sky.night
              ? tokens.night.background
              : tokens.surface.day.background
            : sky.palette.text,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.ml,
    paddingVertical: tokens.spacing.xl,
  },
  scrim: { flex: 1, backgroundColor: 'rgba(8, 18, 24, 0.56)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: tokens.radius.sheet,
    borderWidth: tokens.border,
    paddingHorizontal: tokens.spacing.ml,
    paddingTop: tokens.spacing.ml,
    gap: tokens.spacing.ml,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.smd },
  icon: {
    width: tokens.target,
    height: tokens.target,
    borderRadius: tokens.radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm },
  action: {
    flex: 1,
    minHeight: tokens.target,
    borderRadius: tokens.radius.button,
    borderWidth: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.smd,
  },
});
