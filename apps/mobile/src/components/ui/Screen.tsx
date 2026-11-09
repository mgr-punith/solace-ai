import type { ReactNode, ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../../theme/tokens';
import { useLayoutMetrics } from '../../theme/layout';

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
  const layout = useLayoutMetrics();
  return (
    <SafeAreaView
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={styles.screen}
    >
      <KeyboardAvoidingView enabled={keyboard} behavior="padding" style={styles.screen}>
        <ScrollView
          style={styles.screen}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: layout.gutter, paddingTop: layout.top },
            centered && styles.centered,
          ]}
        >
          <View style={[styles.content, { gap: layout.gap }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: tokens.spacing.lg },
  centered: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: tokens.maxWidth },
});
