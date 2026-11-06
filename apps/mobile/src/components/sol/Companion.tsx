import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { gentleHaptic } from '../../lib/haptics';
import Sol from './Sol';
import type { SolState } from './types';

export function Companion({
  mood = 2,
  state = 'idle',
  size = tokens.sol.hero,
}: {
  mood?: number;
  state?: SolState;
  size?: number;
}) {
  const theme = useTheme();
  const focused = useIsFocused();
  const [greeting, setGreeting] = useState(0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Say hello to Sol"
      onPress={() => {
        setGreeting((value) => value + 1);
        void gentleHaptic(theme.haptics);
      }}
      style={styles.character}
    >
      <Sol
        mood={mood}
        state={state}
        size={size}
        active={focused && theme.active}
        reduceMotion={theme.reduceMotion}
        greeting={greeting}
      />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  character: { alignSelf: 'center', minWidth: tokens.target, minHeight: tokens.target },
});
