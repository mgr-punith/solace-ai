import { chatProviderNames } from '@solace/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Action, AppText } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import type { useChatProvider } from './provider-info';

export function ProviderNotice({
  query,
  compact = false,
}: {
  query: ReturnType<typeof useChatProvider>;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { sky } = useTheme();
  if (query.isError)
    return (
      <>
        <AppText accessibilityRole="alert">
          We couldn’t confirm who processes your chat. Try again before sending.
        </AppText>
        <Action secondary onPress={() => void query.refetch()}>
          Reload chat details
        </Action>
      </>
    );
  if (compact && query.data)
    return (
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat privacy"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={({ pressed }) => ({
            minHeight: tokens.target,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            opacity: pressed ? tokens.opacity.pressed : 1,
          })}
        >
          <Icon name="privacy" size={tokens.icon.sm} color={sky.palette.secondary} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
            Saved in your account · sent to {chatProviderNames[query.data.provider]} for replies
          </AppText>
          <Icon
            name={expanded ? 'close' : 'chevron'}
            size={tokens.icon.sm}
            color={sky.palette.secondary}
          />
        </Pressable>
        {expanded && (
          <AppText variant="bodySmall" tone="secondary">
            Sol uses this conversation to reply. Check-ins are only shared when you choose to send
            them in a message. You can delete conversations from Talk. Sol is AI, not a therapist.
          </AppText>
        )}
      </View>
    );
  return (
    <AppText variant="bodySmall" tone="secondary">
      {query.data
        ? `Messages are saved in your account and sent to ${chatProviderNames[query.data.provider]} for replies.`
        : 'Loading chat privacy details…'}
    </AppText>
  );
}
