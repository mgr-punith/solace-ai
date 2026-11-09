import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { DailyWellness } from '@solace/shared';
import { AppText, Surface } from '../../components/ui/primitives';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';

export function DailyMoments({ daily }: { daily: DailyWellness }) {
  const { sky } = useTheme();
  const pauseSaved = daily.breathingSessions > 0 || daily.readAffirmationIds.length > 0;
  const count = Number(daily.checkedIn) + Number(pauseSaved);
  const size = tokens.completion.ringSize;
  const radius = (size - tokens.completion.ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const steps: { label: string; done: boolean; icon: IconName }[] = [
    { label: 'Check in', done: daily.checkedIn, icon: 'sun' },
    { label: 'Breathe or read', done: pauseSaved, icon: 'wellness' },
  ];
  return (
    <Surface style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.title}>
          <AppText variant="heading">Today with Sol</AppText>
          <AppText variant="caption" tone="secondary">
            {count}/2 saved
          </AppText>
        </View>
        <View style={styles.ring} importantForAccessibility="no-hide-descendants" aria-hidden>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={sky.outline}
              strokeWidth={tokens.completion.ringStroke}
            />
            {count > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={sky.palette.text}
                strokeWidth={tokens.completion.ringStroke}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - count / 2)}
                strokeLinecap="round"
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            )}
          </Svg>
          <View style={styles.ringIcon}>
            <Icon name={count === 2 ? 'check' : 'sun'} size={tokens.icon.sm} />
          </View>
        </View>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Daily moments"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={count}
        aria-valuetext={steps
          .map((step) => `${step.label}: ${step.done ? 'saved' : 'optional'}`)
          .join('. ')}
        accessibilityValue={{
          min: 0,
          max: 2,
          now: count,
          text: steps
            .map((step) => `${step.label}: ${step.done ? 'saved' : 'optional'}`)
            .join('. '),
        }}
        style={styles.trail}
      >
        {steps.map((step, index) => (
          <View key={step.label} style={styles.step}>
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: step.done ? tokens.colors.lantern : sky.palette.background,
                  borderColor: step.done ? tokens.colors.lantern : sky.palette.secondary,
                },
              ]}
            >
              <Icon
                name={step.done ? 'check' : step.icon}
                size={tokens.icon.sm}
                color={step.done ? tokens.colors.face : sky.palette.secondary}
              />
            </View>
            <AppText variant="caption">{step.label}</AppText>
            {index === 0 && (
              <View style={[styles.line, { backgroundColor: sky.palette.secondary }]} />
            )}
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">
        {count === 2
          ? 'Both moments saved. Come back when you want to.'
          : count === 1
            ? 'One moment saved. You can leave it there or try another.'
            : 'Check in or take a short break. Choose what fits today.'}
      </AppText>
    </Surface>
  );
}
const styles = StyleSheet.create({
  section: { gap: tokens.spacing.sm },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  title: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  ring: { width: tokens.completion.ringSize, height: tokens.completion.ringSize },
  ringIcon: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  trail: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  step: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  marker: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, height: tokens.border },
});
