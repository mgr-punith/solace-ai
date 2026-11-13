import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { affirmationForDay, localDay } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader, NavigationRow, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { deviceTimezone } from '../mood/hooks';
import { useLayoutMetrics } from '../../theme/layout';
export function WellnessScreen() {
  const { now } = useTheme();
  const { compact } = useLayoutMetrics();
  const [response, setResponse] = useState<string | null>(null);
  const today = affirmationForDay(localDay(now, deviceTimezone()));
  return (
    <Screen inTabs>
      <PageHeader title="Take a break" />
      <Surface>
        <View style={layoutStyles.row}>
          <View style={layoutStyles.grow}>
            <AppText variant="heading">Breathe with Sol</AppText>
            <AppText variant="caption" tone="secondary">
              1 minute · at your pace
            </AppText>
          </View>
          <Companion
            size={compact ? tokens.sol.wellness : tokens.sol.homeSmall}
            onResponse={setResponse}
          />
        </View>
        <AppText variant="bodySmall" tone="secondary">
          Follow Sol’s rhythm. Choose a different pace or duration in Customize.
        </AppText>
        {response && response !== moods[2].response && (
          <AppText variant="caption" accessibilityLiveRegion="polite" tone="secondary">
            {response}
          </AppText>
        )}
        <Action icon="play" onPress={() => router.push('/breathing')}>
          Take a breathing break
        </Action>
      </Surface>
      <Surface style={styles.words}>
        <AppText variant="caption" tone="secondary">
          Today’s words
        </AppText>
        <AppText variant="expressive">{today.text}</AppText>
        <NavigationRow
          icon="book"
          title="Open affirmations"
          onPress={() => router.push('/affirmations')}
        />
      </Surface>
      <Surface style={styles.links}>
        <NavigationRow
          icon="questions"
          title="Your daily four"
          subtitle="Four questions · 40 points each day"
          onPress={() => router.push('/daily-questions')}
        />
        <NavigationRow
          icon="heart"
          title="Your saved words"
          subtitle="Affirmations you’ve saved"
          onPress={() => router.push('/affirmations?saved=1')}
        />
        <NavigationRow
          icon="bell"
          title="Your reminders"
          subtitle="Choose the days and times"
          onPress={() => router.push('/reminders')}
        />
      </Surface>
    </Screen>
  );
}
const styles = StyleSheet.create({
  words: { gap: tokens.spacing.smd },
  links: { gap: 0 },
});
