import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  DAILY_QUESTION_POINTS,
  questionnaireSuggestion,
  type QuestionnaireSave,
} from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { IconButton, layoutStyles } from '../../components/ui/layout';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { useAuth } from '../auth/context';
import { chooseAnswer, newQuestionnaireDraft, type QuestionnaireDraft } from './draft';
import { useDailyQuestions, useQuestionnaireDraft, useSaveQuestionnaire } from './hooks';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

export function QuestionnaireScreen() {
  const auth = useAuth();
  return <DailyQuestionsFlow key={auth.session?.user.id} />;
}

function DailyQuestionsFlow() {
  const query = useDailyQuestions();
  const { draft, setDraft } = useQuestionnaireDraft();
  const { isSaving, save } = useSaveQuestionnaire();
  const { sky, haptics } = useTheme();
  const [celebrate, setCelebrate] = useState(false);
  const [openingDay, setOpeningDay] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const mounted = useRef(true);
  const initialized = useRef(false);
  const today = query.data;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    // An unfinished day belongs to the user until they explicitly open the new set.
    if (today && !initialized.current) {
      initialized.current = true;
      if (!draft || (draft.result && draft.day !== today.day))
        setDraft({
          ...newQuestionnaireDraft(today),
          result: today.completion
            ? { completion: today.completion, totalPoints: today.totalPoints }
            : null,
        });
    } else if (
      today?.completion &&
      draft &&
      draft.day === today.day &&
      !draft.result &&
      !draft.pending
    ) {
      setDraft({
        ...draft,
        result: { completion: today.completion, totalPoints: today.totalPoints },
      });
    }
  }, [today, draft, setDraft]);

  const result =
    draft?.result ??
    (today?.completion && (!draft || draft.day === today.day)
      ? { completion: today.completion, totalPoints: today.totalPoints }
      : null);
  const question = draft?.questions[draft.step];
  const reviewing = draft?.step === 4;
  const selected = draft?.answers.find((answer) => answer.questionId === question?.id);
  const locked = isSaving || !!draft?.pending;
  const newDay =
    draft?.failure === 'day-changed' ||
    (!!today && !!draft && today.day !== draft.day && !draft.pending);

  async function finish() {
    if (!draft || isSaving) return;
    try {
      const saved = await save(draft);
      if (saved && mounted.current) {
        setCelebrate(true);
        void gentleHaptic(haptics);
      }
    } catch {
      // The account-scoped draft carries the error and exact retry input across dismissal.
    }
  }
  async function openToday() {
    if (isSaving || openingDay) return;
    setOpeningDay(true);
    setOpenFailed(false);
    const refreshed = await query.refetch();
    if (mounted.current) {
      if (refreshed.data && !refreshed.isError) {
        setCelebrate(false);
        setDraft({
          ...newQuestionnaireDraft(refreshed.data),
          result: refreshed.data.completion
            ? {
                completion: refreshed.data.completion,
                totalPoints: refreshed.data.totalPoints,
              }
            : null,
        });
      } else setOpenFailed(true);
      setOpeningDay(false);
    }
  }

  return (
    <Screen key={result ? `saved:${result.completion.id}` : `${draft?.day}:${draft?.step}`}>
      <View style={layoutStyles.row}>
        {!result && draft && draft.step > 0 && (
          <IconButton
            icon="back"
            label="Previous question"
            disabled={locked || openingDay}
            onPress={() => setDraft({ ...draft, step: draft.step - 1 })}
          />
        )}
        <View style={layoutStyles.grow}>
          <AppText variant="heading">Your daily four</AppText>
        </View>
        <Action variant="quiet" label="Close daily questions" onPress={close}>
          Close
        </Action>
      </View>
      {query.isError && !result && (
        <Surface>
          <AppText variant="bodySmall" tone="error" accessibilityRole="alert">
            {draft
              ? 'Today’s status couldn’t refresh. Your answers are still here.'
              : 'Your daily questions couldn’t be loaded.'}
          </AppText>
          <Action variant="secondary" onPress={() => void query.refetch()}>
            Reload daily questions
          </Action>
        </Surface>
      )}
      {newDay && (
        <Surface>
          <AppText variant="bodySmall" accessibilityRole="alert">
            A new day has started. Open today’s questions to earn today’s points.
          </AppText>
          <Action disabled={openingDay || isSaving} onPress={() => void openToday()}>
            {openingDay ? 'Opening today’s four…' : 'Open today’s four'}
          </Action>
          {openFailed && (
            <AppText tone="error" accessibilityRole="alert">
              Today’s questions couldn’t load. Try again.
            </AppText>
          )}
        </Surface>
      )}
      {result ? (
        <QuestionnaireResult
          result={{ ...result, totalPoints: Math.max(result.totalPoints, today?.totalPoints ?? 0) }}
          today={today?.day}
          draft={draft?.result && draft.answers.length === 4 ? draft : null}
          celebrate={celebrate}
        />
      ) : draft ? (
        <>
          <View style={styles.intro}>
            <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">
              {reviewing
                ? 'Four answers ready'
                : `Question ${draft.step + 1} of 4 · ${question?.topic}`}
            </AppText>
            <View
              style={styles.progress}
              accessibilityRole="progressbar"
              accessible
              accessibilityLabel="Questions answered"
              accessibilityValue={{ min: 0, max: 4, now: draft.answers.length }}
            >
              {draft.questions.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: draft.answers.some((answer) => answer.questionId === item.id)
                        ? tokens.action.background
                        : sky.outline,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          {reviewing ? (
            <>
              <AppText variant="title" accessibilityRole="header">
                Your four answers
              </AppText>
              <View style={styles.review}>
                {draft.questions.map((item, index) => {
                  const answer = draft.answers.find((value) => value.questionId === item.id);
                  const label = item.options.find(
                    (option) => option.id === answer?.optionId,
                  )?.label;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.topic} answer: ${label ?? 'No answer'}`}
                      accessibilityState={{ disabled: locked || openingDay }}
                      disabled={locked || openingDay}
                      onPress={() => setDraft({ ...draft, step: index })}
                      style={({ pressed }) => [
                        styles.reviewRow,
                        { borderColor: sky.outline, opacity: pressed ? tokens.opacity.pressed : 1 },
                      ]}
                    >
                      <View style={layoutStyles.grow}>
                        <AppText variant="caption" tone="secondary">
                          {item.topic}
                        </AppText>
                        <AppText variant="bodySmall">{label}</AppText>
                      </View>
                      <Icon name="chevron" size={tokens.icon.sm} />
                    </Pressable>
                  );
                })}
              </View>
              <AppText variant="bodySmall" tone="secondary">
                All answers earn the same points, including skips.
              </AppText>
              <AppText variant="caption" tone="secondary">
                Solace saves your completion and points. Your answers aren’t stored.
              </AppText>
              {draft.failure === 'invalid' && (
                <AppText tone="error" accessibilityRole="alert">
                  One of your answers couldn’t be saved. Review all four and try again.
                </AppText>
              )}
              {draft.pending && !isSaving && !newDay && (
                <AppText variant="bodySmall" tone="error" accessibilityRole="alert">
                  Your save hasn’t been confirmed. Retry to check it; you’ll only earn the points
                  once.
                </AppText>
              )}
              {!newDay && (
                <Action
                  icon="check"
                  disabled={isSaving || openingDay || draft.answers.length !== 4}
                  onPress={() => void finish()}
                >
                  {isSaving
                    ? 'Saving your four…'
                    : draft.pending
                      ? 'Retry saving your four'
                      : `Finish and earn ${DAILY_QUESTION_POINTS} points`}
                </Action>
              )}
              {isSaving && (
                <ActivityIndicator
                  accessibilityLabel="Saving daily questions"
                  color={sky.palette.text}
                />
              )}
            </>
          ) : (
            question && (
              <>
                <AppText
                  variant="title"
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                >
                  {question.prompt}
                </AppText>
                <View
                  style={styles.choices}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={question.prompt}
                >
                  {question.options.map((option) => {
                    const checked = selected?.optionId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ checked, disabled: locked || openingDay }}
                        disabled={locked || openingDay}
                        onPress={() => {
                          setDraft(chooseAnswer(draft, question.id, option.id));
                          if (!checked) void gentleHaptic(haptics, 'selection');
                        }}
                        style={({ pressed }) => [
                          styles.choice,
                          {
                            backgroundColor: checked ? tokens.action.background : sky.surface,
                            borderColor: checked ? sky.palette.text : sky.outline,
                            opacity: pressed ? tokens.opacity.pressed : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            { borderColor: checked ? tokens.action.text : sky.palette.secondary },
                          ]}
                        >
                          {checked && (
                            <View
                              style={[styles.radioDot, { backgroundColor: tokens.action.text }]}
                            />
                          )}
                        </View>
                        <AppText
                          variant="body"
                          style={checked ? { color: tokens.action.text } : undefined}
                        >
                          {option.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <Action
                  disabled={!selected || locked || openingDay}
                  onPress={() => setDraft({ ...draft, step: draft.step + 1 })}
                >
                  {draft.step === 3 ? 'Review answers' : 'Next question'}
                </Action>
                <AppText variant="caption" tone="secondary">
                  Close anytime. Your answers stay here until you finish or restart the app.
                </AppText>
              </>
            )
          )}
        </>
      ) : (
        !query.isError && (
          <View style={layoutStyles.centered}>
            <ActivityIndicator
              accessibilityLabel="Loading daily questions"
              color={sky.palette.text}
            />
            <AppText tone="secondary">Opening your daily four…</AppText>
          </View>
        )
      )}
    </Screen>
  );
}

function QuestionnaireResult({
  result,
  today,
  draft,
  celebrate,
}: {
  result: QuestionnaireSave;
  today: string | undefined;
  draft: QuestionnaireDraft | null;
  celebrate: boolean;
}) {
  const { reduceMotion, active } = useTheme();
  const scale = useSharedValue(1);
  const played = useRef(false);
  useEffect(() => {
    if (celebrate && !played.current) {
      played.current = true;
      if (!reduceMotion && active) {
        scale.value = 0.94;
        scale.value = withTiming(1, { duration: tokens.motion.calm });
      }
    }
    return () => {
      cancelAnimation(scale);
      scale.value = 1;
    };
  }, [celebrate, reduceMotion, active, scale]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const suggestion = draft ? questionnaireSuggestion(draft.day, draft.answers) : null;
  return (
    <>
      <Animated.View style={[styles.saved, motion]} accessibilityLiveRegion="polite">
        <View style={styles.stamp}>
          <Icon name="check" color={tokens.colors.face} size={tokens.icon.lg} />
        </View>
        <AppText variant="title" accessibilityRole="header">
          Your points are saved
        </AppText>
        <AppText>
          {result.completion.points} points saved{' '}
          {today === result.completion.day ? 'today' : `for ${result.completion.day}`}.
        </AppText>
        <AppText variant="heading">{result.totalPoints} points total</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {today === result.completion.day
            ? 'You’re finished for today. Another four tomorrow.'
            : 'That set is complete.'}
        </AppText>
      </Animated.View>
      <Action onPress={close}>Done</Action>
      {suggestion && (
        <Surface>
          <AppText variant="heading">{suggestion.title}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {suggestion.description}
          </AppText>
          <Action variant="secondary" onPress={() => router.replace(suggestion.route)}>
            {suggestion.action}
          </Action>
        </Surface>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  intro: { gap: tokens.spacing.sm },
  progress: { flexDirection: 'row', gap: tokens.spacing.sm },
  segment: { flex: 1, height: tokens.spacing.xs, borderRadius: tokens.radius.pill },
  choices: { gap: tokens.spacing.sm },
  choice: {
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.input,
    borderWidth: tokens.selectedBorder,
  },
  radio: {
    width: tokens.icon.md,
    height: tokens.icon.md,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.selectedBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: tokens.spacing.smd,
    height: tokens.spacing.smd,
    borderRadius: tokens.radius.pill,
  },
  review: { gap: tokens.spacing.xs },
  reviewRow: {
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    paddingVertical: tokens.spacing.smd,
    borderBottomWidth: tokens.border,
  },
  saved: { alignItems: 'center', gap: tokens.spacing.md, paddingVertical: tokens.spacing.lg },
  stamp: {
    width: tokens.sol.compact,
    height: tokens.sol.compact,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.lantern,
  },
});
