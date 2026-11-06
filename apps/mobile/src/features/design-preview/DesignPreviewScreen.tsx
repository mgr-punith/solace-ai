import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import Sol from '../../components/sol/Sol';
import type { SolState } from '../../components/sol/types';
import { useTheme } from '../../theme/ThemeProvider';
import { COMPANION_NAME, moods, tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import { useAuth } from '../auth/context';

const states: { value: SolState; label: string }[] = [
  { value: 'idle', label: 'Rest' },
  { value: 'greeting', label: 'Greet' },
  { value: 'thinking', label: 'Think' },
  { value: 'breathing', label: 'Breathe' },
];

export function DesignPreviewScreen() {
  const theme = useTheme();
  const auth = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const moodSpace =
    Math.min(width - tokens.spacing.md * 2, tokens.maxWidth) -
    tokens.spacing.ml * 2 -
    tokens.border * 2;
  const wrapMoods = moodSpace < tokens.moodChoiceWidth * fontScale * 5 + tokens.spacing.xs * 4;
  const [focused, setFocused] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [state, setState] = useState<SolState>('idle');
  const [greeting, setGreeting] = useState(0);
  const [exhaling, setExhaling] = useState(false);
  const active = theme.active && focused;
  const { setPreviewMinute, setAppearance, setStaticPreview } = theme;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setPreviewMinute(null);
        setAppearance('auto');
        setStaticPreview(false);
      };
    }, [setPreviewMinute, setAppearance, setStaticPreview]),
  );
  useEffect(() => {
    setExhaling(false);
    if (state !== 'breathing' || !active || theme.reduceMotion) return;
    const timer = setInterval(() => setExhaling((value) => !value), tokens.motion.breath);
    return () => clearInterval(timer);
  }, [state, active, theme.reduceMotion]);
  const name = auth.session?.user.name.trim().split(/\s+/)[0];
  const hour = Math.floor(theme.minute / 60);
  const greetingText = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const time = `${String(hour).padStart(2, '0')}:${String(Math.floor(theme.minute % 60)).padStart(2, '0')}`;
  function changeState(next: SolState) {
    setState(next);
    setGreeting((value) => value + (next === 'greeting' ? 1 : 0));
    void gentleHaptic(theme.haptics);
  }
  if (!__DEV__) return null;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.topRow}>
            <Action
              secondary
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            >
              Back
            </Action>
            <Surface style={styles.date}>
              <AppText variant="caption">
                {theme.now.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </AppText>
            </Surface>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Say hello to ${COMPANION_NAME}`}
            accessibilityHint="Sol responds with a gentle greeting"
            onPress={() => {
              setGreeting((value) => value + 1);
              void gentleHaptic(theme.haptics);
            }}
            style={styles.hero}
          >
            <Sol
              state={state}
              mood={mood ?? 2}
              greeting={greeting}
              active={active}
              reduceMotion={theme.reduceMotion}
            />
          </Pressable>
          <Surface style={styles.reading}>
            <AppText variant="display" accessibilityRole="header">
              {greetingText}
              {name ? `, ${name}` : ''}.
            </AppText>
            <AppText tone="secondary">Take a breath. You’re here.</AppText>
            <View style={styles.moodSection}>
              <AppText variant="heading" accessibilityRole="header">
                How are you arriving?
              </AppText>
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
                    style={({ pressed }) => [
                      styles.mood,
                      wrapMoods && styles.wrappedMood,
                      {
                        minWidth: tokens.moodChoiceWidth * fontScale,
                        borderColor: mood === index ? theme.sky.palette.text : tokens.colors.clear,
                        opacity: pressed ? tokens.opacity.pressed : 1,
                      },
                    ]}
                  >
                    <View style={[styles.moodDot, { backgroundColor: item.color }]}>
                      <AppText variant="caption" style={{ color: tokens.colors.face }}>
                        {index + 1}
                      </AppText>
                    </View>
                    <AppText variant="caption" style={styles.center}>
                      {item.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <AppText tone="secondary" accessibilityLiveRegion="polite">
                {mood === null ? 'There’s no right or wrong way to feel.' : moods[mood]?.response}
              </AppText>
              <AppText variant="caption" tone="secondary">
                Preview only · This mood isn’t saved.
              </AppText>
            </View>
            {state === 'breathing' && (
              <AppText variant="title" style={styles.center}>
                {theme.reduceMotion
                  ? 'Breathe at your own pace.'
                  : exhaling
                    ? 'Breathe out.'
                    : 'Breathe in.'}
              </AppText>
            )}
            <Action onPress={() => changeState(state === 'breathing' ? 'idle' : 'breathing')}>
              {state === 'breathing' ? 'Finish this pause' : 'Take a slow breath'}
            </Action>
            <View style={[styles.affirmation, { borderColor: theme.sky.palette.secondary }]}>
              <AppText variant="title">You can take this moment one breath at a time.</AppText>
            </View>
          </Surface>
          <Surface style={styles.controls}>
            <AppText variant="heading" accessibilityRole="header">
              Design preview
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              Explore the sky, Sol, and a practice check-in.
            </AppText>
            {theme.fontError && (
              <AppText tone="error">
                The fonts couldn’t load. Reopen this preview to try again.
              </AppText>
            )}
            <AppText>Sky time · {time}</AppText>
            <Slider
              accessibilityLabel="Sky time"
              accessibilityValue={{ text: time }}
              minimumValue={0}
              maximumValue={1439}
              step={1}
              value={theme.minute}
              disabled={theme.appearance !== 'auto'}
              onValueChange={theme.setPreviewMinute}
              minimumTrackTintColor={theme.sky.palette.text}
              maximumTrackTintColor={tokens.action.background}
              thumbTintColor={theme.sky.palette.text}
              style={styles.slider}
            />
            <View style={styles.choices}>
              {(['auto', 'day', 'night'] as const).map((value) => (
                <Action
                  key={value}
                  secondary
                  selected={theme.appearance === value}
                  onPress={() => theme.setAppearance(value)}
                >
                  {value === 'auto' ? 'Auto' : value === 'day' ? 'Day' : 'Night'}
                </Action>
              ))}
              <Action
                secondary
                onPress={() => {
                  theme.setPreviewMinute(null);
                  theme.setAppearance('auto');
                }}
              >
                Use current time
              </Action>
            </View>
            <AppText>Sol’s expression</AppText>
            <View style={styles.choices}>
              {states.map((item) => (
                <Action
                  key={item.value}
                  secondary
                  selected={state === item.value}
                  onPress={() => changeState(item.value)}
                >
                  {item.label}
                </Action>
              ))}
            </View>
            <View style={styles.toggleRow}>
              <AppText>Reduce Motion</AppText>
              <Switch
                accessibilityLabel="Reduce Motion"
                value={theme.reduceMotion}
                disabled={theme.systemReduceMotion}
                onValueChange={theme.setStaticPreview}
                trackColor={{ false: theme.sky.palette.secondary, true: tokens.action.background }}
              />
            </View>
            {theme.systemReduceMotion && (
              <AppText variant="caption" tone="secondary">
                Your device has Reduce Motion enabled.
              </AppText>
            )}
            <View style={styles.toggleRow}>
              <AppText>Haptics</AppText>
              <Switch
                accessibilityLabel="Haptics"
                value={theme.haptics}
                onValueChange={theme.setHaptics}
                trackColor={{ false: theme.sky.palette.secondary, true: tokens.action.background }}
              />
            </View>
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.xl,
    alignItems: 'center',
  },
  column: { width: '100%', maxWidth: tokens.maxWidth, gap: tokens.spacing.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  date: { padding: tokens.spacing.smd, borderRadius: tokens.radius.pill },
  hero: { alignSelf: 'center', minWidth: tokens.sol.hero, minHeight: tokens.sol.hero },
  reading: { gap: tokens.spacing.md },
  moodSection: { gap: tokens.spacing.smd, marginTop: tokens.spacing.sm },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: tokens.spacing.xs,
  },
  mood: {
    minWidth: tokens.target,
    minHeight: tokens.target,
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderWidth: tokens.selectedBorder,
    borderRadius: tokens.radius.tag,
    gap: tokens.spacing.sm,
  },
  wrappedMood: { flex: 0, flexBasis: '30%' },
  moodDot: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  affirmation: {
    borderLeftWidth: tokens.selectedBorder,
    paddingLeft: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
  },
  controls: { marginTop: tokens.spacing.xl },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: tokens.target,
    gap: tokens.spacing.md,
  },
  slider: { width: '100%', height: tokens.target },
});
