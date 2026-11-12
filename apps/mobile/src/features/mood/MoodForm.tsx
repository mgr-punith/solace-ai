import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { emotionTags, moodInputSchema, type MoodCheckin, type MoodInput } from '@solace/shared';
import { Action, AppText } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { deviceTimezone, useSaveMood } from './hooks';
import { MoodChoice } from './MoodChoice';

// A non-secret retry key, not an authentication credential.
const requestId = () =>
  `mood-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export function MoodForm({
  onMood,
  onSaved,
  onCancel,
}: {
  onMood: (mood: number) => void;
  onSaved: (entry: MoodCheckin) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<MoodInput['tags']>([]);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryInput = useRef<MoodInput | null>(null);
  const sending = useRef(false);
  const mutation = useSaveMood();
  const { sky, fontsLoaded, haptics } = useTheme();
  const locked = mutation.isPending || retryInput.current !== null;
  async function save() {
    if (sending.current) return;
    const parsed = moodInputSchema.safeParse(
      retryInput.current ?? {
        requestId: requestId(),
        mood,
        tags,
        note,
        timezone: deviceTimezone(),
      },
    );
    if (!parsed.success) {
      setError('Choose how you feel before saving.');
      return;
    }
    retryInput.current = parsed.data;
    sending.current = true;
    setError(null);
    try {
      const saved = await mutation.mutateAsync(parsed.data);
      retryInput.current = null;
      onSaved(saved);
      void gentleHaptic(haptics);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Your check-in couldn’t be saved. Try again.',
      );
    } finally {
      sending.current = false;
    }
  }
  return (
    <>
      <AppText variant="heading" accessibilityRole="header">
        How are you feeling?
      </AppText>
      <AppText variant="bodySmall" tone="secondary">
        Pick the closest match.
      </AppText>
      <View style={styles.selectionName}>
        <AppText
          variant="heading"
          accessibilityLiveRegion="polite"
          tone={mood === null ? 'secondary' : 'text'}
        >
          {mood === null ? 'Choose a mood' : moods[mood - 1]!.label}
        </AppText>
      </View>
      <View
        style={styles.moods}
        accessible
        accessibilityLabel={
          mood === null ? 'Choose one mood' : `${moods[mood - 1]!.label} selected`
        }
      >
        {moods.map((item, index) => (
          <MoodChoice
            key={item.label}
            index={index}
            selected={mood === index + 1}
            disabled={locked}
            onPress={() => {
              setMood(index + 1);
              onMood(index);
              void gentleHaptic(haptics, 'selection');
            }}
          />
        ))}
      </View>
      <Action
        variant="quiet"
        icon="plus"
        label={expanded ? 'Hide check-in details' : 'Add a note or feelings'}
        disabled={locked}
        onPress={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide details' : 'Add details'}
      </Action>
      {expanded && (
        <>
          <AppText variant="bodySmall" tone="secondary">
            Choose up to five words, if any fit.
          </AppText>
          <View style={styles.tags}>
            {emotionTags.map((tag) => (
              <EmotionChip
                key={tag}
                selected={tags.includes(tag)}
                disabled={locked || (!tags.includes(tag) && tags.length >= 5)}
                onPress={() =>
                  setTags((current) =>
                    current.includes(tag)
                      ? current.filter((value) => value !== tag)
                      : [...current, tag],
                  )
                }
                label={tag}
              />
            ))}
          </View>
          <AppText variant="heading">A note to yourself</AppText>
          <TextInput
            accessibilityLabel="Optional check-in note"
            placeholder="What would you like to remember?"
            placeholderTextColor={sky.palette.secondary}
            value={note}
            onChangeText={setNote}
            editable={!locked}
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={[
              styles.input,
              {
                color: sky.palette.text,
                borderColor: sky.palette.secondary,
                fontFamily: fontsLoaded ? tokens.type.body.fontFamily : undefined,
              },
            ]}
          />
          <AppText variant="caption" tone="secondary">
            Optional · {note.length}/500. Solace saves this in your account.
          </AppText>
        </>
      )}
      {error && (
        <AppText accessibilityRole="alert" tone="error">
          {error}
        </AppText>
      )}
      {mutation.isPending && (
        <ActivityIndicator accessibilityLabel="Saving your check-in" color={sky.palette.text} />
      )}
      <View style={styles.actions}>
        {onCancel && (
          <Action label="Cancel check-in" secondary disabled={locked} onPress={onCancel}>
            Cancel
          </Action>
        )}
        <Action
          icon="check"
          label={error && retryInput.current ? 'Retry saving check-in' : 'Save check-in'}
          disabled={mutation.isPending || (mood === null && !retryInput.current)}
          onPress={() => void save()}
        >
          {error && retryInput.current ? 'Retry' : 'Save'}
        </Action>
      </View>
      {error && retryInput.current && (
        <>
          <AppText variant="bodySmall" tone="secondary">
            Your details are kept here. Retry checks the same save so it won’t create a duplicate.
          </AppText>
          <Action
            secondary
            disabled={mutation.isPending}
            onPress={() => {
              retryInput.current = null;
              setError(null);
              mutation.reset();
            }}
          >
            Edit this check-in
          </Action>
        </>
      )}
    </>
  );
}

function EmotionChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { sky } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tagTarget,
        { opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.pressed : 1 },
      ]}
    >
      <View
        style={[
          styles.tagPill,
          {
            backgroundColor: selected ? tokens.action.background : sky.palette.background,
            borderColor: selected ? tokens.action.background : sky.outline,
          },
        ]}
      >
        <AppText
          variant="buttonSmall"
          style={{ color: selected ? tokens.action.text : sky.palette.text }}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  selectionName: { minHeight: tokens.type.heading.lineHeight, alignItems: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: tokens.spacing.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.spacing.sm },
  tagTarget: { minHeight: tokens.target, justifyContent: 'center' },
  tagPill: {
    minHeight: tokens.spacing.xl,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.smd,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.border,
  },
  input: {
    ...tokens.type.body,
    minHeight: tokens.target * 3,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.input,
    borderWidth: tokens.border,
  },
});
