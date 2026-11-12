import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { IconButton } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export function MoodCheckinModal({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const { sky, reduceMotion } = useTheme();
  if (!visible) return null;

  return (
    <Modal animationType="none" transparent visible statusBarTranslucent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
        <Animated.View
          {...(!reduceMotion && {
            entering: FadeIn.duration(tokens.motion.quick),
            exiting: FadeOut.duration(tokens.motion.quick),
          })}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close check-in"
            onPress={onDismiss}
            style={styles.scrim}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel="Daily check-in"
          onAccessibilityEscape={onDismiss}
          {...(!reduceMotion && {
            entering: ZoomIn.duration(tokens.motion.calm),
            exiting: ZoomOut.duration(tokens.motion.quick),
          })}
          style={[
            styles.dialog,
            {
              backgroundColor: sky.surface,
              borderColor: sky.outline,
              maxHeight: height - tokens.spacing.hero,
            },
          ]}
        >
          <View style={styles.closeRow}>
            <IconButton icon="close" label="Close check-in" onPress={onDismiss} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xl,
  },
  scrim: { flex: 1, backgroundColor: 'rgba(8, 18, 24, 0.56)' },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: tokens.radius.sheet,
    borderWidth: tokens.border,
    overflow: 'hidden',
  },
  closeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
  },
  content: {
    gap: tokens.spacing.smd,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.ml,
  },
});
