import { Icon } from '../../components/ui/Icon';
import { MoodFace } from '../../components/ui/MoodFace';
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
              <View style={{ flexDirection: 'row', gap: tokens.spacing.xs }} accessible={false}>
                {pages.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: index === step ? tokens.spacing.lg : tokens.spacing.sm,
                      height: tokens.spacing.xs,
                      borderRadius: tokens.radius.pill,
                      backgroundColor:
                        index === step ? theme.sky.palette.text : theme.sky.palette.secondary,
                    }}
                  />
                ))}
              </View>
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
          <Surface style={{ paddingVertical: tokens.spacing.xl }}>
            <Icon
              name={
                step === 0 ? 'sparkles' : step === 1 ? 'heart' : step === 2 ? 'talk' : 'privacy'
              }
            />
            <AppText accessibilityRole="header" variant="display">
              {page.title}
            </AppText>
            <AppText tone="secondary">{page.body}</AppText>
            {step === 0 && (
              <AppText variant="bodySmall">You choose what to share with Sol.</AppText>
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
                      <MoodFace mood={index} />
                      <AppText variant="caption">{item.label}</AppText>
                    </Pressable>
                  ))}
                </View>
                <AppText accessibilityLiveRegion="polite">
                  {mood === null ? 'Try a mood and watch Sol respond.' : moods[mood]?.response}
                </AppText>
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
