import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Action, AppText } from '../components/ui/primitives';
import { Icon } from '../components/ui/Icon';
import { useTheme } from './ThemeProvider';
import { tokens } from './tokens';

const options = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: 'Light' },
  { value: 'night', label: 'Dark' },
] as const;

export function AppearanceControl() {
  const theme = useTheme();
  const disabled = theme.appearanceBusy || theme.appearanceStatus !== 'ready';
  return (
    <View style={styles.section}>
      <AppText variant="bodySmall">Appearance</AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Appearance"
        style={[styles.choices, { backgroundColor: theme.sky.palette.background }]}
      >
        {options.map(({ value, label }) => {
          const selected = theme.appearance === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected, disabled }}
              aria-checked={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onPress={() => {
                void theme.setAppearance(value);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? tokens.action.background : tokens.colors.clear,
                  borderColor: selected ? theme.sky.palette.text : tokens.colors.clear,
                  opacity: pressed ? tokens.opacity.pressed : 1,
                },
              ]}
            >
              {selected && <Icon name="check" size={tokens.icon.sm} color={tokens.action.text} />}
              <AppText
                variant="bodySmall"
                style={{ color: selected ? tokens.action.text : theme.sky.palette.text }}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone="secondary">
        Auto follows the time of day. Saved on this device.
      </AppText>
      {theme.appearanceBusy && (
        <ActivityIndicator
          accessibilityLabel={
            theme.appearanceStatus === 'loading'
              ? 'Opening appearance settings'
              : 'Saving appearance preference'
          }
          color={theme.sky.palette.text}
        />
      )}
      {theme.appearanceError && (
        <>
          <AppText accessibilityRole="alert" tone="error">
            {theme.appearanceError}
          </AppText>
          <Action
            variant="quiet"
            onPress={() => {
              void theme.retryAppearance();
            }}
          >
            Retry appearance
          </Action>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: tokens.spacing.sm },
  choices: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.button + tokens.spacing.xs,
  },
  option: {
    flex: 1,
    minWidth: tokens.target,
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    borderWidth: tokens.border,
    borderRadius: tokens.radius.button,
  },
});
