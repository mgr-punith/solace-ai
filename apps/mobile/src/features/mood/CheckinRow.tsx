import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MoodCheckin } from '@solace/shared';
import { IconButton, layoutStyles } from '../../components/ui/layout';
import { MoodFace } from '../../components/ui/MoodFace';
import { AppText } from '../../components/ui/primitives';
import { moods, tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

export const CheckinRow = memo(function CheckinRow({
  entry,
  onDelete,
  disabled,
  first = false,
}: {
  entry: MoodCheckin;
  onDelete: (id: string) => void;
  disabled: boolean;
  first?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <View
      style={[styles.row, !first && { borderTopColor: sky.outline, borderTopWidth: tokens.border }]}
    >
      <MoodFace mood={entry.mood - 1} size={tokens.spacing.xl} />
      <View style={layoutStyles.grow}>
        <View style={styles.heading}>
          <AppText variant="heading">{moods[entry.mood - 1]?.label}</AppText>
          <AppText variant="caption" tone="secondary">
            {new Date(entry.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </AppText>
        </View>
        {entry.tags.length > 0 && (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {entry.tags.join(' · ')}
          </AppText>
        )}
        {entry.note ? (
          <AppText variant="bodySmall" numberOfLines={2}>
            {entry.note}
          </AppText>
        ) : null}
      </View>
      <IconButton
        icon="delete"
        disabled={disabled}
        label={`Delete ${moods[entry.mood - 1]?.label} check-in from ${new Date(entry.createdAt).toLocaleDateString()}`}
        onPress={() => onDelete(entry.id)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    paddingVertical: tokens.spacing.smd,
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
});
