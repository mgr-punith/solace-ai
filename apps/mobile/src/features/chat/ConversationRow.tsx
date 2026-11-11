import { Pressable, StyleSheet, View } from 'react-native';
import type { Conversation } from '@solace/shared';
import { AppText } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { IconButton, layoutStyles } from '../../components/ui/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { tokens } from '../../theme/tokens';
import { conversationTime, conversationTitle } from './titles';

export function ConversationRow({
  item,
  onOpen,
  onDelete,
  deleting,
  first = false,
}: {
  item: Conversation;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  first?: boolean;
}) {
  const { sky } = useTheme();
  return (
    <View
      style={[
        styles.entry,
        !first && { borderTopColor: sky.outline, borderTopWidth: tokens.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Continue ${conversationTitle(item)}, ${conversationTime(item)}`}
        onPress={() => onOpen(item.id)}
        style={({ pressed }) => [styles.main, { opacity: pressed ? tokens.opacity.pressed : 1 }]}
      >
        <View style={[styles.icon, { backgroundColor: sky.palette.background }]}>
          <Icon name="talk" size={tokens.icon.md} />
        </View>
        <View style={layoutStyles.grow}>
          <AppText variant="bodySmall" numberOfLines={1}>
            {conversationTitle(item)}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {conversationTime(item)}
          </AppText>
        </View>
        <Icon name="chevron" size={tokens.icon.sm} color={sky.palette.secondary} />
      </Pressable>
      <IconButton
        icon="delete"
        label="Delete conversation"
        disabled={deleting}
        onPress={() => onDelete(item.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  main: {
    flex: 1,
    minHeight: tokens.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.smd,
    paddingVertical: tokens.spacing.sm,
  },
  icon: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
