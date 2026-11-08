import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { affirmationForDay, localDay } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { PageHeader, NavigationRow, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { deviceTimezone } from '../mood/hooks';
export function WellnessScreen() {
  const { now, sky } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [response, setResponse] = useState<string | null>(null);
  const today = affirmationForDay(localDay(now, deviceTimezone()));
  return (
    <Screen inTabs>
      <PageHeader title="Take a break" subtitle="Try a breathing exercise or read today’s words." />
      <Surface>
        <View style={[layoutStyles.row, fontScale > 1.2 && styles.stacked]}>
          <View style={layoutStyles.grow}>
            <AppText variant="heading">Breathe with Sol</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Start with one minute. Change the rhythm or length in Customize.
            </AppText>
          </View>
          <Companion size={tokens.sol.home} onResponse={setResponse} />
        </View>
        <AppText variant="caption" accessibilityLiveRegion="polite" tone="secondary">
          {response ?? 'Tap Sol to say hello. Hold to breathe along.'}
        </AppText>
        <Action icon="play" onPress={() => router.push('/breathing')}>
          Take a breathing break
        </Action>
      </Surface>
      <View style={styles.words}>
        <AppText variant="caption" tone="secondary">
          Today’s words
        </AppText>
        <AppText variant="title">{today.text}</AppText>
        <NavigationRow
          icon="book"
          title="Open affirmations"
          onPress={() => router.push('/affirmations')}
        />
      </View>
      <View style={[styles.links, { borderColor: sky.palette.secondary }]}>
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
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  words: { gap: tokens.spacing.sm, paddingTop: tokens.spacing.sm },
  links: { borderTopWidth: tokens.border, paddingTop: tokens.spacing.sm },
});
