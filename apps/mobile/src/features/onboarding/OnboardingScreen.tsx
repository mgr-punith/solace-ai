import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
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
import { moods, tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { useAuth } from '../auth/context';
import { useOnboarding } from './context';
import { PrivacyChoice } from './PrivacyChoice';

const pages = [
  {
    title: 'A little space for you.',
    body: 'Meet Sol, your AI companion for a check-in, a conversation, or a quiet pause.',
  },
  {
    title: 'Start with how you feel.',
    body: 'Some days feel heavy. Others feel lighter. There’s room for all of them.',
  },
  {
    title: 'You can talk it through.',
    body: 'When chat is available, bring what’s on your mind. Sol will listen and help you explore a small next step.',
  },
  {
    title: 'Your space. Your choice.',
    body: 'Before you continue, here’s how Solace handles your information.',
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
  const [enabled, setEnabled] = useState(onboarding.choice ?? false);
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
    if (await onboarding.complete(enabled)) router.replace('/');
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.top}>
            {step > 0 ? (
              <Action secondary disabled={onboarding.busy} onPress={() => void move(step - 1)}>
                Back
              </Action>
            ) : reviewing ? (
              <Action secondary onPress={() => router.replace('/')}>
                Close
              </Action>
            ) : (
              <View style={styles.placeholder} />
            )}
            <Surface style={styles.progress}>
              <AppText variant="caption" accessibilityLabel={`Introduction, step ${step + 1} of 4`}>
                {step + 1} of 4
              </AppText>
            </Surface>
            {step < 3 ? (
              <Action secondary disabled={onboarding.busy} onPress={() => void move(3)}>
                Skip intro
              </Action>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
          {step < 3 && (
            <Companion
              mood={mood ?? 2}
              state={step === 0 ? 'greeting' : 'idle'}
              size={compact ? tokens.sol.onboarding : tokens.sol.hero}
            />
          )}
          <Surface>
            <AppText accessibilityRole="header" variant="display">
              {page.title}
            </AppText>
            <AppText tone="secondary">{page.body}</AppText>
            {step === 0 && (
              <AppText variant="bodySmall">
                A few moments, at your own pace. You decide what to share.
              </AppText>
            )}
            {step === 1 && (
              <>
                <View style={styles.moods}>
                  {moods.map((item, index) => (
                    <Pressable
                      key={item.label}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label}, ${index + 1} of 5`}
                      accessibilityState={{ selected: mood === index }}
                      onPress={() => {
                        setMood(index);
                        void gentleHaptic(theme.haptics, 'selection');
                      }}
                      style={[
                        styles.mood,
                        {
                          minWidth: tokens.moodChoiceWidth * fontScale,
                          borderColor:
                            mood === index ? theme.sky.palette.text : tokens.colors.clear,
                        },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: item.color }]}>
                        <AppText variant="caption" style={{ color: tokens.colors.face }}>
                          {index + 1}
                        </AppText>
                      </View>
                      <AppText variant="caption">{item.label}</AppText>
                    </Pressable>
                  ))}
                </View>
                <AppText accessibilityLiveRegion="polite">
                  {mood === null ? 'Try a mood and watch Sol respond.' : moods[mood]?.response}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Just a practice check-in. This choice isn’t saved.
                </AppText>
              </>
            )}
            {step === 2 && (
              <View style={[styles.example, { borderColor: theme.sky.palette.secondary }]}>
                <AppText variant="caption" tone="secondary">
                  Example conversation
                </AppText>
                <AppText variant="bodySmall">You: “My thoughts won’t slow down.”</AppText>
                <AppText>
                  Sol: “That sounds tiring. What’s taking up the most space right now?”
                </AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Small steps, without pressure. You can pause whenever you need.
                </AppText>
              </View>
            )}
            {step === 3 && (
              <PrivacyChoice enabled={enabled} onChange={setEnabled} disabled={onboarding.busy} />
            )}
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
              disabled={onboarding.busy}
              onPress={() => void (step < 3 ? move(step + 1) : complete())}
            >
              {step < 3
                ? 'Continue'
                : reviewing
                  ? 'Save choice'
                  : auth.status === 'signedIn'
                    ? 'Save and continue'
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.xs,
  },
  placeholder: { width: tokens.target },
  progress: { padding: tokens.spacing.smd, borderRadius: tokens.radius.pill },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  mood: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.tag,
    borderWidth: tokens.selectedBorder,
    minHeight: tokens.target,
  },
  dot: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  example: {
    paddingLeft: tokens.spacing.md,
    borderLeftWidth: tokens.selectedBorder,
    gap: tokens.spacing.md,
  },
});
