import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../components/ui/primitives';
import { moods, tokens } from '../../theme/tokens';
import { MoodChoice } from './MoodChoice';

export function MoodSelector({
  selected,
  disabled = false,
  onSelect,
  response,
}: {
  selected: number | null;
  disabled?: boolean;
  onSelect: (index: number) => void;
  response?: boolean;
}) {
  const { fontScale, width } = useWindowDimensions();
  const compact = width < tokens.layout.compactWidth || fontScale > 1.1;
  const faceSize = compact ? 30 : tokens.moodFace;
  return (
    <View style={styles.container}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={
          selected === null ? 'Choose one mood' : `${moods[selected]?.label} selected`
        }
        style={styles.choices}
      >
        {moods.map((mood, index) => (
          <MoodChoice
            key={mood.label}
            index={index}
            selected={selected === index}
            disabled={disabled}
            faceSize={faceSize}
            onPress={() => onSelect(index)}
          />
        ))}
      </View>
      {response && (
        <AppText accessibilityLiveRegion="polite" style={styles.response}>
          {selected === null ? 'Try a mood and watch Sol respond.' : moods[selected]?.response}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.spacing.smd },
  choices: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  response: { textAlign: 'center' },
});
