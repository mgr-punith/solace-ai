import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { WellnessProgress } from '@solace/shared';
import { Action, AppText, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { moods, tokens } from '../../theme/tokens';
import { useProgress } from '../wellness/hooks';
import { useLayoutMetrics } from '../../theme/layout';
export function WeekChart({ progress }: { progress: WellnessProgress }) {
  const { sky } = useTheme();
  const { compact } = useLayoutMetrics();
  const width = tokens.chart.width;
  const height = compact ? tokens.chart.compactHeight : tokens.chart.height;
  const inset = tokens.spacing.md;
  const x = (index: number) => ((index + 0.5) * width) / 7;
  const y = (mood: number) => height - inset - ((mood - 1) * (height - inset * 2)) / 4;
  let path = '';
  let previous = false;
  progress.days.forEach((day, index) => {
    if (day.moodAverage === null) {
      previous = false;
      return;
    }
    path += `${previous ? 'L' : 'M'} ${x(index)} ${y(day.moodAverage)} `;
    previous = true;
  });
  const hasMood = progress.days.some((day) => day.moodAverage !== null);
  return (
    <View style={styles.chart}>
      {hasMood ? (
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden={true}
        >
          {[1, 3, 5].map((mood) => (
            <Line
              key={mood}
              x1={inset}
              x2={width - inset}
              y1={y(mood)}
              y2={y(mood)}
              stroke={sky.palette.secondary}
              strokeOpacity={tokens.opacity.glow}
              strokeDasharray="3 6"
            />
          ))}
          <Path
            d={path}
            stroke={sky.palette.text}
            strokeWidth={tokens.selectedBorder}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {progress.days.map((day, index) =>
            day.moodAverage === null ? null : (
              <Circle
                key={day.day}
                cx={x(index)}
                cy={y(day.moodAverage)}
                r={tokens.spacing.xs}
                fill={moods[Math.round(day.moodAverage) - 1]?.color ?? tokens.colors.seaGlass}
                stroke={sky.palette.text}
                strokeWidth={tokens.border}
              />
            ),
          )}
        </Svg>
      ) : (
        <AppText tone="secondary">Check in on Home to see your mood here.</AppText>
      )}
      <View style={styles.days}>
        {progress.days.map((day) => (
          <View
            key={day.day}
            accessible
            accessibilityLabel={`${day.day}: ${day.moodAverage === null ? 'No mood check-in' : `average mood ${day.moodAverage.toFixed(1)} of 5`}, ${day.actions} saved actions`}
            style={styles.day}
          >
            <AppText variant="caption" tone="secondary">
              {new Date(`${day.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </AppText>
            <View
              style={[
                styles.activity,
                {
                  backgroundColor: day.actions ? tokens.action.background : sky.palette.background,
                  borderColor: sky.palette.secondary,
                },
              ]}
            >
              {day.actions ? (
                <Icon name="check" size={tokens.icon.sm} color={tokens.action.text} />
              ) : (
                <AppText variant="caption" tone="secondary">
                  ·
                </AppText>
              )}
            </View>
            <AppText variant="caption">{day.moodAverage?.toFixed(1) ?? '—'}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="secondary">
        Mood, 1–5 · ✓ marks a day with a saved activity.
      </AppText>
    </View>
  );
}
export function ProgressSummary({ compact = false }: { compact?: boolean }) {
  const query = useProgress();
  const progress = query.data;
  if (query.isError)
    return (
      <Surface>
        <AppText tone="error" accessibilityRole="alert">
          Your progress couldn’t be loaded.
        </AppText>
        <Action secondary onPress={() => void query.refetch()}>
          Reload progress
        </Action>
      </Surface>
    );
  if (!progress)
    return (
      <Surface>
        <AppText tone="secondary" accessibilityLiveRegion="polite">
          Loading your progress…
        </AppText>
      </Surface>
    );
  if (compact)
    return (
      <View style={layoutStyles.row}>
        <Icon name="sun" />
        <View style={layoutStyles.grow}>
          <AppText variant="heading">
            {progress.currentStreak
              ? `${progress.currentStreak} ${progress.currentStreak === 1 ? 'day' : 'days'} with Sol`
              : progress.welcomeBack
                ? 'Welcome back.'
                : 'Your progress'}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {progress.welcomeBack
              ? 'Your previous check-ins are here.'
              : progress.totalDays
                ? `You’ve checked in or saved an activity on ${progress.totalDays} ${progress.totalDays === 1 ? 'day' : 'days'}.`
                : 'Save a check-in to get started.'}
          </AppText>
        </View>
      </View>
    );
  const seconds = progress.days.reduce((sum, day) => sum + day.breathingSeconds, 0);
  const minutes = Math.round(seconds / 60);
  const sessions = progress.days.reduce((sum, day) => sum + day.breathingSessions, 0);
  return (
    <View style={layoutStyles.gap}>
      <Surface>
        <View style={layoutStyles.row}>
          <Icon name="sun" />
          <View style={layoutStyles.grow}>
            <AppText variant="caption" tone="secondary">
              {progress.welcomeBack ? 'Welcome back' : 'Your days with Sol'}
            </AppText>
            <AppText variant="title">
              {progress.currentStreak} {progress.currentStreak === 1 ? 'day' : 'days'} in a row
            </AppText>
            <AppText variant="caption" tone="secondary">
              {progress.welcomeBack
                ? 'Your previous check-ins are here.'
                : progress.totalDays
                  ? `${progress.totalDays} ${progress.totalDays === 1 ? 'day' : 'days'} with a check-in or activity`
                  : 'Save a check-in or a wellness activity to begin.'}
            </AppText>
          </View>
        </View>
      </Surface>
      <Surface>
        <View style={layoutStyles.row}>
          <Icon name="progress" />
          <AppText variant="heading">The last seven days</AppText>
        </View>
        <WeekChart progress={progress} />
        <View style={styles.metric}>
          <Icon name="wind" />
          <View style={layoutStyles.grow}>
            <AppText variant="heading">
              {minutes} breathing {minutes === 1 ? 'minute' : 'minutes'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {sessions} saved {sessions === 1 ? 'session' : 'sessions'} this week
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="secondary">
          Dates follow {progress.timezone.replaceAll('_', ' ')}.
        </AppText>
      </Surface>
    </View>
  );
}
const styles = StyleSheet.create({
  chart: { gap: tokens.spacing.sm },
  days: {
    flexDirection: 'row',
  },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.spacing.xs },
  activity: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
  },
});
