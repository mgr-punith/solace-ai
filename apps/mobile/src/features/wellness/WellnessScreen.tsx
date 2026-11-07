import { router } from 'expo-router';
import { View } from 'react-native';
import { affirmationForDay, localDay } from '@solace/shared';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { PageHeader, NavigationRow, layoutStyles } from '../../components/ui/layout';
import { Companion } from '../../components/sol/Companion';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { deviceTimezone } from '../mood/hooks';
export function WellnessScreen() {
  const { now } = useTheme();
  const today = affirmationForDay(localDay(now, deviceTimezone()));
  return (
    <Screen inTabs>
      <PageHeader title="A moment for you" subtitle="Small rituals. Your own pace." />
      <Surface>
        <View style={layoutStyles.row}>
          <Icon name="wind" />
          <AppText variant="bodySmall" tone="secondary">
            Breathe with Sol
          </AppText>
        </View>
        <Companion state="idle" size={tokens.sol.onboarding} />
        <AppText variant="title">Make a little room.</AppText>
        <AppText tone="secondary">
          Follow a gentle rhythm for a minute, or stay a little longer.
        </AppText>
        <Action icon="play" onPress={() => router.push('/breathing')}>
          Take a breathing break
        </Action>
      </Surface>
      <Surface>
        <View style={layoutStyles.row}>
          <Icon name="sparkles" />
          <AppText variant="bodySmall" tone="secondary">
            Today’s words
          </AppText>
        </View>
        <AppText variant="title">{today.text}</AppText>
        <NavigationRow
          icon="book"
          title="Open affirmations"
          subtitle="A thought to carry with you"
          onPress={() => router.push('/affirmations')}
        />
      </Surface>
      <Surface style={{ paddingVertical: tokens.spacing.sm }}>
        <NavigationRow
          icon="heart"
          title="Your saved words"
          subtitle="Come back to what resonates"
          onPress={() => router.push('/affirmations?saved=1')}
        />
        <NavigationRow
          icon="bell"
          title="Make room for a reminder"
          subtitle="Only when you want one"
          onPress={() => router.push('/reminders')}
        />
      </Surface>
    </Screen>
  );
}
