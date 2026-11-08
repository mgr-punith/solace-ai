import { View } from 'react-native';
import { AppText } from '../../components/ui/primitives';
import { layoutStyles } from '../../components/ui/layout';

export function PrivacyChoice() {
  return (
    <>
      <AppText>
        Sol is an AI companion. It isn’t a therapist or a substitute for professional care.
      </AppText>
      <View style={layoutStyles.gap}>
        <AppText variant="heading">What you share</AppText>
        <AppText tone="secondary">
          Google shares your name and email to create your account. Messages are saved in Solace and
          sent to the AI provider named in chat for replies.
        </AppText>
        <AppText variant="heading">What Sol can use</AppText>
        <AppText tone="secondary">
          Sol uses the current conversation. Your check-ins stay separate unless you choose to send
          one as a message. Sol does not remember across conversations.
        </AppText>
        <AppText variant="heading">Delete your data</AppText>
        <AppText tone="secondary">
          Delete conversations and messages from Talk, check-ins from Progress, or your account and
          its saved data from You. Sharing a check-in in chat creates a separate message; delete
          that conversation to remove the shared copy too.
        </AppText>
      </View>
    </>
  );
}
