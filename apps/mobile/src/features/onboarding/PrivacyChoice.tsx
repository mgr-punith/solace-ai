import { StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../../components/ui/primitives';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export function PrivacyChoice({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <>
      <AppText>
        Sol is an AI companion. It isn’t a therapist or a substitute for professional care.
      </AppText>
      <AppText tone="secondary">
        Google shares your name and email to create your account. When chat is available, messages
        you send will be stored by Solace and sent to its AI provider to generate a reply.
      </AppText>
      <View style={[styles.choice, { borderColor: sky.palette.secondary }]}>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.label}>
            Let Sol remember what helps me
          </AppText>
          <Switch
            accessibilityLabel="Let Sol remember what helps me"
            accessibilityHint="Optional. Saves your preference for future personalization."
            value={enabled}
            onValueChange={onChange}
            disabled={disabled}
            trackColor={{ false: sky.palette.secondary, true: tokens.colors.seaGlass }}
          />
        </View>
        <AppText variant="bodySmall" tone="secondary">
          Optional. When memory is available, Sol can use details from your conversations to
          personalize future replies. You’ll be able to see and delete those memories.
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          Memory isn’t active yet. This choice is saved on this device for your account; you can
          change it in Privacy and memory. On a new device, you’ll choose again.
        </AppText>
      </View>
      <AppText variant="bodySmall" tone="secondary">
        You can delete your account and its saved data at any time. If you’re in immediate danger,
        contact local emergency services or someone you trust.
      </AppText>
    </>
  );
}
const styles = StyleSheet.create({
  choice: {
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: tokens.border,
    borderBottomWidth: tokens.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    minHeight: tokens.target,
  },
  label: { flex: 1 },
});
