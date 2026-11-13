import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Companion } from '../../components/sol/Companion';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { useAuth } from '../auth/context';
import { useOnboarding } from './context';
import { PrivacyChoice } from './PrivacyChoice';
import { MoodSelector } from '../mood/MoodSelector';

const pages = [
  {
    title: 'Meet Sol.',
    body: 'Talk about your day with an AI companion, or take a breathing break.',
  },
  {
    title: 'How are you today?',
    body: 'Pick the closest match. Add a note when you have more to say.',
  },
  {
    title: 'Talk it through.',
    body: 'Tell Sol what happened. You can ask for ideas or ask it to listen.',
  },
  {
    title: 'Your privacy.',
    body: 'Read what Solace stores and what you can delete.',
  },
] as const;

export function OnboardingScreen() {
  const onboarding = useOnboarding();
  const auth = useAuth();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const reviewing = review === '1';
  const [step, setStep] = useState(
    reviewing ? 0 : onboarding.document.completed ? 3 : onboarding.document.step,
  );
  const [mood, setMood] = useState<number | null>(null);
  const theme = useTheme();
  const { height, fontScale } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const compact = height < 740 || fontScale > 1.1;
  const page = pages[step] ?? pages[0];
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  const move = useCallback(
    async (next: number) => {
      if (onboarding.busy) return;
      if (reviewing || (await onboarding.setStep(next))) {
        setStep(next);
        void gentleHaptic(theme.haptics);
      }
    },
    [onboarding.busy, onboarding.setStep, reviewing, theme.haptics],
  );
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step > 0) {
          void move(step - 1);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step, move]),
  );
  async function complete() {
    // Preserve any legacy preference without treating it as consent for a new capability.
    if (await onboarding.complete(onboarding.choice ?? false)) router.replace('/');
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.top}>
            <View style={styles.topSide}>
              {step > 0 ? (
                <Action secondary disabled={onboarding.busy} onPress={() => void move(step - 1)}>
                  Back
                </Action>
              ) : reviewing ? (
                <Action secondary onPress={() => router.replace('/')}>
                  Close
                </Action>
              ) : null}
            </View>
            <Surface style={styles.progress}>
              <View style={styles.progressMarkers} accessible={false}>
                {pages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressMarker,
                      {
                        width: index === step ? tokens.spacing.lg : tokens.spacing.sm,
                        backgroundColor:
                          index === step ? theme.sky.palette.text : theme.sky.palette.secondary,
                      },
                    ]}
                  />
                ))}
              </View>
              <AppText
                variant="caption"
                accessibilityLabel={`Introduction, step ${step + 1} of 4`}
                style={styles.progressLabel}
              >
                {step + 1} of 4
              </AppText>
            </Surface>
            <View style={[styles.topSide, styles.topSideEnd]}>
              {step < 3 ? (
                <Action secondary disabled={onboarding.busy} onPress={() => void move(3)}>
                  Skip intro
                </Action>
              ) : null}
            </View>
          </View>
          {step < 3 && (
            <Companion
              mood={mood ?? 2}
              state={step === 0 ? 'greeting' : 'idle'}
              size={compact ? tokens.sol.onboarding : tokens.sol.hero}
            />
          )}
          <Surface style={styles.page}>
            <AppText accessibilityRole="header" variant="display">
              {page.title}
            </AppText>
            <AppText tone="secondary">{page.body}</AppText>
            {step === 0 && (
              <AppText variant="bodySmall">You choose what to share with Sol.</AppText>
            )}
            {step === 1 && (
              <>
                <MoodSelector
                  selected={mood}
                  response
                  onSelect={(index) => {
                    setMood(index);
                    void gentleHaptic(theme.haptics, 'selection');
                  }}
                />
                <AppText variant="caption" tone="secondary">
                  This is a practice check-in. Solace won’t save it.
                </AppText>
              </>
            )}
            {step === 2 && (
              <View style={[styles.example, { borderColor: theme.sky.palette.secondary }]}>
                <AppText variant="caption" tone="secondary">
                  Example conversation
                </AppText>
                <AppText variant="bodySmall">
                  You: “I keep thinking about tomorrow’s meeting.”
                </AppText>
                <AppText>Sol: “What part of the meeting are you worried about?”</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Come back to the same conversation later.
                </AppText>
              </View>
            )}
            {step === 3 && <PrivacyChoice />}
            {onboarding.error && (
              <AppText tone="error" accessibilityRole="alert">
                {onboarding.error}
              </AppText>
            )}
            {onboarding.busy && (
              <ActivityIndicator
                accessibilityLabel="Saving your choice"
                color={theme.sky.palette.text}
              />
            )}
            <Action
              icon={step < 3 ? 'arrow' : 'check'}
              disabled={onboarding.busy}
              onPress={() => void (step < 3 ? move(step + 1) : complete())}
            >
              {step < 3
                ? 'Continue'
                : reviewing
                  ? 'Done'
                  : auth.status === 'signedIn'
                    ? 'Continue to Solace'
                    : 'Continue to sign in'}
            </Action>
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', padding: tokens.spacing.md },
  column: { maxWidth: tokens.maxWidth, width: '100%', gap: tokens.spacing.md },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  topSide: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  topSideEnd: { alignItems: 'flex-end' },
  progress: {
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.smd,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
  },
  progressMarkers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  progressMarker: {
    height: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
  },
  progressLabel: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  page: { paddingVertical: tokens.spacing.xl },
  example: {
    paddingLeft: tokens.spacing.md,
    borderLeftWidth: tokens.selectedBorder,
    gap: tokens.spacing.md,
  },
});
