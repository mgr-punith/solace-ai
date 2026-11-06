import type { ReactNode, ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../../theme/tokens';

export function Screen({
  children,
  centered = false,
  inTabs = false,
  keyboard = false,
  refreshControl,
}: {
  children: ReactNode;
  centered?: boolean;
  inTabs?: boolean;
  keyboard?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        enabled={keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[styles.scroll, centered && styles.centered]}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', padding: tokens.spacing.lg },
  centered: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: tokens.maxWidth, gap: tokens.spacing.lg },
});
