import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  isQuietTime,
  reminderSettingsSchema,
  type Reminder,
  type ReminderSettings,
} from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Screen } from '../../components/ui/Screen';
import { Icon, type IconName } from '../../components/ui/Icon';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { requestNotificationPermission } from '../../lib/notifications';
import { reminderLabels } from './content';
import { useReminders } from './context';

const reminderIcons: Record<Reminder['type'], IconName> = {
  mood: 'heart',
  affirmation: 'sparkles',
  breathing: 'wind',
  'self-care': 'wellness',
  custom: 'bell',
};
const days = [
  { day: 2, label: 'Mon' },
  { day: 3, label: 'Tue' },
  { day: 4, label: 'Wed' },
  { day: 5, label: 'Thu' },
  { day: 6, label: 'Fri' },
  { day: 7, label: 'Sat' },
  { day: 1, label: 'Sun' },
];
function TimeInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { sky } = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="bodySmall">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder="19:00"
        placeholderTextColor={sky.palette.secondary}
        maxLength={5}
        autoCorrect={false}
        style={[styles.input, { color: sky.palette.text, borderColor: sky.palette.secondary }]}
      />
    </View>
  );
}
export function RemindersScreen() {
  const reminders = useReminders();
  const { sky } = useTheme();
  const [draft, setDraft] = useState<ReminderSettings | null>(reminders.settings);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(reminders.settings);
  }, [reminders.settings, dirty]);
  const busy = reminders.busy || permissionBusy;
  function edit(next: ReminderSettings) {
    setDraft(next);
    setDirty(true);
    setNotice(null);
  }
  function editReminder(type: Reminder['type'], change: Partial<Reminder>) {
    if (draft)
      edit({
        ...draft,
        reminders: draft.reminders.map((r) => (r.type === type ? { ...r, ...change } : r)),
      });
  }
  async function save() {
    const result = reminderSettingsSchema.safeParse(draft);
    if (!result.success) {
      setNotice(
        'Use 24-hour times such as 19:00, select a day for each enabled reminder, and check quiet hours.',
      );
      return;
    }
    if (await reminders.save(result.data)) setDirty(false);
  }
  async function allow() {
    setPermissionBusy(true);
    setNotice(null);
    try {
      await requestNotificationPermission();
      await reminders.refresh();
    } catch {
      setNotice(
        'Notification permission could not be opened. Try again or use your phone settings.',
      );
    } finally {
      setPermissionBusy(false);
    }
  }
  return (
    <Screen keyboard>
      <Action icon="back" secondary onPress={() => router.replace('/you')}>
        Back to You
      </Action>
      <AppText variant="display" accessibilityRole="header">
        Gentle reminders
      </AppText>
      <AppText tone="secondary">
        Choose when a little nudge would help. Everything starts off. Times follow this phone’s
        local time.
      </AppText>
      <Surface>
        <AppText variant="heading">A small invitation</AppText>
        <AppText>
          Solace can show reminders even when the app is closed. You choose the days and can turn
          them off anytime.
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          Reminder messages can appear on your lock screen. Android may deliver them a little late
          to save battery.
        </AppText>
        {reminders.permission === 'granted' ? (
          <AppText>Notifications are allowed on this phone.</AppText>
        ) : reminders.permission === 'unsupported' ? (
          <AppText>Open the Android app to enable notifications.</AppText>
        ) : reminders.permission === 'denied' ? (
          <>
            <AppText>
              Notifications are off on this phone. Your preferences can still be saved.
            </AppText>
            <Action
              secondary
              disabled={busy}
              onPress={() =>
                void Linking.openSettings().catch(() =>
                  setNotice('Open this app’s notifications in your phone settings.'),
                )
              }
            >
              Open phone settings
            </Action>
          </>
        ) : (
          <Action disabled={busy} onPress={() => void allow()}>
            Allow notifications
          </Action>
        )}
      </Surface>
      {reminders.status === 'loading' && (
        <ActivityIndicator accessibilityLabel="Loading reminders" color={sky.palette.text} />
      )}
      {reminders.error && (
        <Surface>
          <AppText accessibilityRole="alert" tone="error">
            {reminders.error}
          </AppText>
          <Action secondary disabled={busy} onPress={() => void reminders.refresh()}>
            Retry account sync
          </Action>
        </Surface>
      )}
      {draft && (
        <>
          {!draft.reminders.some((r) => r.enabled) && (
            <AppText>No reminders are on. Choose one below if it would help.</AppText>
          )}
          {draft.reminders.map((r) => (
            <Surface key={r.type}>
              <View style={styles.row}>
                <Icon name={reminderIcons[r.type]} />
                <AppText variant="heading" style={styles.grow}>
                  {reminderLabels[r.type]}
                </AppText>
                <Switch
                  accessibilityLabel={`Enable ${reminderLabels[r.type]}`}
                  value={r.enabled}
                  disabled={busy}
                  trackColor={{ true: tokens.action.background, false: sky.palette.secondary }}
                  onValueChange={(enabled) => editReminder(r.type, { enabled })}
                />
              </View>
              {r.enabled && (
                <>
                  <TimeInput
                    label={`${reminderLabels[r.type]} time (24-hour)`}
                    value={r.time}
                    disabled={busy}
                    onChange={(time) => editReminder(r.type, { time })}
                  />
                  <AppText variant="bodySmall">Repeat on</AppText>
                  <View style={styles.days}>
                    {days.map(({ day, label }) => (
                      <Action
                        key={day}
                        secondary
                        selected={r.days.includes(day)}
                        disabled={busy}
                        label={`${reminderLabels[r.type]} ${label}`}
                        onPress={() =>
                          editReminder(r.type, {
                            days: r.days.includes(day)
                              ? r.days.filter((d) => d !== day)
                              : [...r.days, day].sort(),
                          })
                        }
                      >
                        {label}
                      </Action>
                    ))}
                  </View>
                  {r.type === 'custom' && (
                    <>
                      <AppText variant="bodySmall">Write a gentle reminder (optional)</AppText>
                      <TextInput
                        accessibilityLabel="Your reminder message"
                        value={r.customText}
                        maxLength={120}
                        multiline
                        editable={!busy}
                        onChangeText={(customText) => editReminder(r.type, { customText })}
                        style={[
                          styles.input,
                          { color: sky.palette.text, borderColor: sky.palette.secondary },
                        ]}
                      />
                      <AppText variant="caption" tone="secondary">
                        This message may be visible on your lock screen. Avoid private details.
                      </AppText>
                    </>
                  )}
                  {isQuietTime(r.time, draft.quietHours) && (
                    <AppText tone="secondary">
                      This time falls in quiet hours, so this reminder will be skipped.
                    </AppText>
                  )}
                </>
              )}
            </Surface>
          ))}
          <Surface>
            <View style={styles.row}>
              <AppText variant="heading" style={styles.grow}>
                Quiet hours
              </AppText>
              <Switch
                accessibilityLabel="Enable quiet hours"
                value={draft.quietHours.enabled}
                disabled={busy}
                trackColor={{ true: tokens.action.background, false: sky.palette.secondary }}
                onValueChange={(enabled) =>
                  edit({ ...draft, quietHours: { ...draft.quietHours, enabled } })
                }
              />
            </View>
            <AppText variant="bodySmall">Skip reminders scheduled during these hours.</AppText>
            {draft.quietHours.enabled && (
              <>
                <TimeInput
                  label="Quiet hours start (24-hour)"
                  value={draft.quietHours.start}
                  disabled={busy}
                  onChange={(start) =>
                    edit({ ...draft, quietHours: { ...draft.quietHours, start } })
                  }
                />
                <TimeInput
                  label="Quiet hours end (24-hour)"
                  value={draft.quietHours.end}
                  disabled={busy}
                  onChange={(end) => edit({ ...draft, quietHours: { ...draft.quietHours, end } })}
                />
              </>
            )}
          </Surface>
          {notice && (
            <AppText tone="error" accessibilityRole="alert">
              {notice}
            </AppText>
          )}
          <Action disabled={busy || !dirty} onPress={() => void save()}>
            {busy ? 'Saving your preferences…' : 'Save reminders'}
          </Action>
          <AppText accessibilityLiveRegion="polite">
            {dirty
              ? 'You have unsaved changes.'
              : reminders.pending
                ? 'Saved on this phone. Account sync is pending.'
                : 'Preferences are saved to your account.'}
          </AppText>
          {!dirty && reminders.permission === 'granted' && (
            <AppText variant="bodySmall" tone="secondary">
              {reminders.count
                ? 'Your chosen reminders are scheduled on this phone.'
                : 'No reminders are scheduled outside quiet hours.'}
            </AppText>
          )}
        </>
      )}
      {reminders.scheduleError && (
        <Surface>
          <AppText tone="error" accessibilityRole="alert">
            {reminders.scheduleError}
          </AppText>
          <Action secondary disabled={busy} onPress={() => void reminders.refresh()}>
            Retry scheduling
          </Action>
        </Surface>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  grow: { flex: 1 },
  field: { gap: tokens.spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  input: {
    ...tokens.type.body,
    minHeight: tokens.target,
    padding: tokens.spacing.smd,
    borderRadius: tokens.radius.input,
    borderWidth: tokens.border,
  },
});
