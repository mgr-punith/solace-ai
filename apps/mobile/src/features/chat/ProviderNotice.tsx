import { chatProviderNames } from '@solace/shared';
import { Action, AppText } from '../../components/ui/primitives';
import type { useChatProvider } from './provider-info';

export function ProviderNotice({ query }: { query: ReturnType<typeof useChatProvider> }) {
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
  return (
    <AppText variant="bodySmall" tone="secondary">
      {query.data
        ? `Messages are saved in your account and sent to ${chatProviderNames[query.data.provider]} for replies.`
        : 'Loading chat privacy details…'}
    </AppText>
  );
}
