import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import Sol from './Sol';
import type { SolProps, SolState } from './types';

const greetings = [
  { reaction: 'wave', text: 'Hi there!' },
  { reaction: 'delight', text: 'Oh, hello again.' },
  { reaction: 'wink', text: 'Caught me winking.' },
] as const;

export function Companion({
  mood = 2,
  state = 'idle',
  size = tokens.sol.hero,
  onResponse,
}: {
  mood?: number;
  state?: SolState;
  size?: number;
  onResponse?: (text: string | null) => void;
}) {
  const theme = useTheme();
  const focused = useIsFocused();
  const active = focused && theme.active;
  const [greeting, setGreeting] = useState(0);
  const [reaction, setReaction] = useState<SolProps['reaction']>();
  const [pressed, setPressed] = useState(false);
  const [holding, setHolding] = useState(false);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const response = useRef(onResponse);
  response.current = onResponse;

  useEffect(() => {
    if (!active) {
      setPressed(false);
      setHolding(false);
      setReaction(undefined);
      response.current?.(null);
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active]);
  useEffect(() => {
    response.current?.(moods[mood]?.response ?? null);
  }, [mood]);

  function greet() {
    if (held.current) return;
    if (timer.current) clearTimeout(timer.current);
    const next = greetings[greeting % greetings.length]!;
    setGreeting((value) => value + 1);
    setReaction(next.reaction);
    response.current?.(next.text);
    void gentleHaptic(theme.haptics);
    timer.current = setTimeout(() => {
      setReaction(undefined);
      response.current?.(null);
    }, tokens.motion.response);
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Say hello to Sol"
      accessibilityHint="Tap for a reaction. Hold for a quiet breath, then release."
      accessibilityValue={{ text: holding ? 'Breathe at your own pace.' : (reaction ?? 'Resting') }}
      onPressIn={() => {
        held.current = false;
        setPressed(true);
      }}
      onLongPress={() => {
        held.current = true;
        if (timer.current) clearTimeout(timer.current);
        setReaction(undefined);
        setHolding(true);
        response.current?.('Breathe at your own pace.');
        void gentleHaptic(theme.haptics);
      }}
      onPressOut={() => {
        setPressed(false);
        setHolding(false);
        if (held.current) response.current?.('Back whenever you want another breath.');
      }}
      onPress={greet}
      style={styles.character}
    >
      <Sol
        mood={mood}
        state={holding ? 'breathing' : state}
        size={size}
        active={active}
        reduceMotion={theme.reduceMotion}
        greeting={greeting}
        reaction={reaction}
        pressed={pressed && !holding}
      />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  character: { alignSelf: 'center', minWidth: tokens.target, minHeight: tokens.target },
});
