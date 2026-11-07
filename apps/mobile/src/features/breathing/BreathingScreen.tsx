import { useScreenBack } from '../../lib/useScreenBack';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Platform, Pressable, Switch, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import {
  breathingPatterns,
  conversationSchema,
  practiceDurations,
  type ActivityInput,
  type BreathingPattern,
} from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { PageHeader, layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { deviceTimezone } from '../mood/hooks';
import { activityRequestId, useSaveActivity } from '../wellness/hooks';
import { usePractice } from './usePractice';
import { BreathingGuide } from './BreathingGuide';
import { Companion } from '../../components/sol/Companion';
import { useAuth } from '../auth/context';
import { reflectionDraft, seedChatDraft } from '../chat/drafts';
import { useStartConversation } from '../chat/useStartConversation';
function MoodRating({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (mood: number | null) => void;
  disabled: boolean;
}) {
  return (
    <View style={layoutStyles.gap}>
      <AppText variant="bodySmall">{label} · optional</AppText>
      <View style={layoutStyles.wrap}>
        {moods.map((mood, index) => (
          <Action
            key={mood.label}
            secondary
            selected={value === index + 1}
            disabled={disabled}
            label={`${label}: ${mood.label}`}
            onPress={() => onChange(value === index + 1 ? null : index + 1)}
          >
            {mood.label}
          </Action>
        ))}
      </View>
    </View>
  );
}
export function BreathingScreen() {
  const { conversation } = useLocalSearchParams<{ conversation?: string }>();
  const parsedConversation = conversationSchema.shape.id.safeParse(conversation);
  const conversationId = parsedConversation.success ? parsedConversation.data : null;
  const goBack = useScreenBack('/wellness');
  const auth = useAuth();
  const client = useQueryClient();
  const chat = useStartConversation();
  const { practice, start, pause, resume, reset } = usePractice();
  const [pattern, setPattern] = useState<BreathingPattern>('coherent');
  const [duration, setDuration] = useState<(typeof practiceDurations)[number]>(60);
  const [beforeMood, setBeforeMood] = useState<number | null>(null);
  const [showBeforeMood, setShowBeforeMood] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [afterMood, setAfterMood] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = useRef<ActivityInput | null>(null);
  const saving = useRef(false);
  const mutation = useSaveActivity();
  const { sky, haptics, setHaptics } = useTheme();
  usePreventRemove(!!practice && !saved && !discard, ({ repeat }) => {
    pause();
    const leave = () => {
      setDiscard(true);
      repeat();
    };
    const message =
      practice?.status === 'complete'
        ? 'This completed session has not been saved. Leave without saving it?'
        : 'This practice will end without being saved.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) leave();
      return;
    }
    Alert.alert('Leave this session?', message, [
      { text: 'Stay here', style: 'cancel' },
      { text: 'Leave session', onPress: leave },
    ]);
  });
  async function save() {
    if (practice?.status !== 'complete' || saving.current || saved) return;
    payload.current ??= {
      requestId: activityRequestId(),
      type: 'breathing',
      timezone: deviceTimezone(),
      pattern,
      durationSeconds: duration,
      beforeMood,
      afterMood,
    };
    saving.current = true;
    setError(null);
    try {
      await mutation.mutateAsync(payload.current);
      setSaved(true);
    } catch {
      setError('Your session couldn’t be saved. Keep this screen open and try again.');
    } finally {
      saving.current = false;
    }
  }
  function stop() {
    pause();
    const clear = () => {
      reset();
      payload.current = null;
      setAfterMood(null);
      setError(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('End this practice without saving?')) clear();
      return;
    }
    Alert.alert(
      'End this practice?',
      'You can begin again whenever you like. Partial sessions are not saved.',
      [
        { text: 'Keep session', style: 'cancel' },
        { text: 'End session', onPress: clear },
      ],
    );
  }
  function reflect() {
    const draft = reflectionDraft(duration, afterMood);
    if (conversationId && auth.session?.user.id) {
      seedChatDraft(client, auth.session.user.id, conversationId, draft);
      router.navigate({ pathname: '/chat/[id]', params: { id: conversationId } });
    } else void chat.start(draft);
  }
  return (
    <Screen>
      <PageHeader title="Breathe" back={goBack} />
      {!practice ? (
        <>
          <View style={layoutStyles.centered}>
            <Companion size={tokens.sol.onboarding} />
            <AppText variant="title">
              {duration === 60 ? 'One minute for you.' : `${duration / 60} minutes for you.`}
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {breathingPatterns[pattern].name} · {breathingPatterns[pattern].description}
            </AppText>
          </View>
          <Action icon="play" onPress={() => start(duration)}>
            Start breathing
          </Action>
          <AppText variant="caption" tone="secondary">
            Breathe comfortably. Pause or stop if it doesn’t feel right.
          </AppText>
          <Action variant="quiet" icon="settings" onPress={() => setCustomizing(!customizing)}>
            {customizing ? 'Close customization' : 'Customize'}
          </Action>
          {customizing && (
            <>
              <View style={layoutStyles.gap}>
                <View style={layoutStyles.row}>
                  <Icon name="wind" />
                  <AppText variant="heading">Find your rhythm</AppText>
                </View>
                {(['coherent', 'box', '478'] as BreathingPattern[]).map((key) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={breathingPatterns[key].name}
                    accessibilityState={{ selected: pattern === key }}
                    onPress={() => setPattern(key)}
                    style={({ pressed }) => [
                      {
                        minHeight: tokens.target,
                        padding: tokens.spacing.smd,
                        borderRadius: tokens.radius.tag,
                        borderWidth: tokens.border,
                        borderColor: pattern === key ? sky.palette.text : sky.surface,
                        backgroundColor: sky.surface,
                        opacity: pressed ? tokens.opacity.pressed : 1,
                      },
                      layoutStyles.row,
                    ]}
                  >
                    <View style={layoutStyles.grow}>
                      <AppText>{breathingPatterns[key].name}</AppText>
                      <AppText variant="caption" tone="secondary">
                        {breathingPatterns[key].description}
                      </AppText>
                    </View>
                    {pattern === key && <Icon name="check" />}
                  </Pressable>
                ))}
              </View>
              <View style={layoutStyles.gap}>
                <AppText variant="heading">How much time feels right?</AppText>
                <View style={layoutStyles.wrap}>
                  {practiceDurations.map((seconds) => (
                    <Action
                      key={seconds}
                      secondary
                      selected={duration === seconds}
                      onPress={() => setDuration(seconds)}
                    >{`${seconds / 60} min`}</Action>
                  ))}
                </View>
                <Action variant="quiet" onPress={() => setShowBeforeMood(!showBeforeMood)}>
                  {showBeforeMood ? 'Hide starting mood' : 'Add a starting mood · optional'}
                </Action>
                {showBeforeMood && (
                  <MoodRating
                    label="Before your session"
                    value={beforeMood}
                    onChange={setBeforeMood}
                    disabled={false}
                  />
                )}
                <View style={layoutStyles.row}>
                  <AppText style={layoutStyles.grow}>Gentle haptics</AppText>
                  <Switch
                    accessibilityLabel="Breathing haptics"
                    value={haptics}
                    onValueChange={setHaptics}
                    trackColor={{ true: tokens.action.background, false: sky.palette.secondary }}
                  />
                </View>
              </View>
            </>
          )}
        </>
      ) : (
        <Surface>
          <AppText variant="caption" tone="secondary">
            {breathingPatterns[pattern].name} · {duration / 60} minute{duration === 60 ? '' : 's'}
          </AppText>
          <BreathingGuide pattern={pattern} practice={practice} />
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Session progress"
            accessibilityValue={{
              min: 0,
              max: duration,
              now: Math.floor(practice.elapsedMs / 1000),
            }}
            style={{
              height: tokens.spacing.xs,
              borderRadius: tokens.radius.pill,
              backgroundColor: sky.palette.background,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${(100 * practice.elapsedMs) / practice.durationMs}%`,
                backgroundColor: sky.palette.text,
              }}
            />
          </View>
          {practice.status !== 'complete' ? (
            <>
              <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                {Math.ceil((practice.durationMs - practice.elapsedMs) / 1000)} seconds remaining
              </AppText>
              <Action
                icon={practice.status === 'running' ? 'pause' : 'play'}
                onPress={practice.status === 'running' ? pause : resume}
              >
                {practice.status === 'running' ? 'Pause session' : 'Resume session'}
              </Action>
              <Action secondary onPress={stop}>
                End session
              </Action>
            </>
          ) : saved ? (
            <>
              <Icon name="complete" />
              <AppText accessibilityLiveRegion="polite" variant="heading">
                Your session is saved.
              </AppText>
              <AppText tone="secondary">Want to talk about how you feel now?</AppText>
              <Action icon="talk" disabled={chat.isPending} onPress={reflect}>
                {chat.isPending
                  ? 'Opening conversation…'
                  : chat.isError
                    ? 'Retry opening chat'
                    : 'Reflect with Sol'}
              </Action>
              <AppText variant="caption" tone="secondary">
                Opens an editable message.{' '}
                {conversationId
                  ? 'Any draft you already wrote is kept.'
                  : 'Send it when you’re ready.'}
              </AppText>
              {chat.isError && (
                <AppText tone="error" accessibilityRole="alert">
                  Your session is saved. The conversation couldn’t open; try again.
                </AppText>
              )}
              <Action variant="quiet" onPress={goBack}>
                {conversationId ? 'Back to conversation' : 'Done'}
              </Action>
            </>
          ) : (
            <>
              <MoodRating
                label="After your session"
                value={afterMood}
                onChange={setAfterMood}
                disabled={mutation.isPending || !!payload.current}
              />
              <AppText variant="caption" tone="secondary">
                Save this session to your progress.
              </AppText>
              {error && (
                <AppText accessibilityRole="alert" tone="error">
                  {error}
                </AppText>
              )}
              {mutation.isPending && (
                <ActivityIndicator accessibilityLabel="Saving session" color={sky.palette.text} />
              )}
              <Action icon="check" disabled={mutation.isPending} onPress={() => void save()}>
                {error ? 'Retry saving session' : 'Save session'}
              </Action>
            </>
          )}
        </Surface>
      )}
    </Screen>
  );
}
