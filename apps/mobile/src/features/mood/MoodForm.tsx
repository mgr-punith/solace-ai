import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { emotionTags, moodInputSchema, type MoodCheckin, type MoodInput } from '@solace/shared';
import { Action, AppText } from '../../components/ui/primitives';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { deviceTimezone, useSaveMood } from './hooks';
import { MoodChoice } from './MoodChoice';
import { Icon } from '../../components/ui/Icon';

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
      <View
        style={styles.steps}
        accessible
        accessibilityLabel={
          mood === null ? 'Step 1 of 2. Choose a mood.' : 'Step 2 of 2. Save when you’re ready.'
        }
      >
        <Icon name={mood === null ? 'sun' : 'check'} size={tokens.icon.sm} />
        <AppText variant="caption" tone="secondary">
          {mood === null ? 'Choose a mood' : `${moods[mood - 1]!.label} selected`}
        </AppText>
        <Icon name="arrow" size={tokens.icon.sm} />
        <AppText variant="caption" tone="secondary">
          Save your check-in
        </AppText>
      </View>
      <View style={styles.moods}>
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
      <Action variant="quiet" disabled={locked} onPress={() => setExpanded(!expanded)}>
        {expanded ? 'Hide extra details' : 'Add a note or feelings'}
      </Action>
      {expanded && (
        <>
          <AppText variant="bodySmall" tone="secondary">
            Choose up to five words, if any fit.
          </AppText>
          <View style={styles.tags}>
            {emotionTags.map((tag) => (
              <Action
                key={tag}
                secondary
                selected={tags.includes(tag)}
                disabled={locked || (!tags.includes(tag) && tags.length >= 5)}
                onPress={() =>
                  setTags((current) =>
                    current.includes(tag)
                      ? current.filter((value) => value !== tag)
                      : [...current, tag],
                  )
                }
              >
                {tag}
              </Action>
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
      <Action
        disabled={mutation.isPending || (mood === null && !retryInput.current)}
        onPress={() => void save()}
      >
        {error && retryInput.current ? 'Retry saving check-in' : 'Save check-in'}
      </Action>
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
      {onCancel && (
        <Action variant="quiet" disabled={locked} onPress={onCancel}>
          Cancel check-in
        </Action>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
  },
  steps: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  input: {
    ...tokens.type.body,
    minHeight: tokens.target * 3,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.input,
    borderWidth: tokens.border,
  },
});
