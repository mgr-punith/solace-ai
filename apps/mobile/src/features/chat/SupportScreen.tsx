import { useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supportResources } from '@solace/shared';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { Action, AppText, Surface } from '../../components/ui/primitives';

export function SupportScreen() {
  const [region, setRegion] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const resource = supportResources.find((item) => item.region === region);
  return (
    <Screen>
      <Action secondary onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        Back
      </Action>
      <AppText variant="display" accessibilityRole="header">
        Support right now
      </AppText>
      <Surface>
        <Icon name="support" />
        <AppText>
          You deserve support from a person. If you are in immediate danger, contact your local
          emergency services or go to the nearest emergency department.
        </AppText>
        <AppText tone="secondary">
          If you can, reach someone you trust and ask them to stay with you. Solace cannot contact
          emergency services for you.
        </AppText>
      </Surface>
      <AppText variant="heading">Where are you right now?</AppText>
      {supportResources.map((item) => (
        <Action
          key={item.region}
          secondary
          selected={region === item.region}
          onPress={() => {
            setRegion(item.region);
            setError(false);
          }}
        >
          {item.region}
        </Action>
      ))}
      <Action
        secondary
        selected={region === 'elsewhere'}
        onPress={() => {
          setRegion('elsewhere');
          setError(false);
        }}
      >
        Somewhere else
      </Action>
      {resource && (
        <Surface>
          <Icon name="support" />
          <AppText variant="heading">{resource.name}</AppText>
          <AppText selectable>{resource.phone}</AppText>
          <Action
            onPress={() => {
              void Linking.openURL(resource.uri).catch(() => setError(true));
            }}
          >{`Open dialer: ${resource.phone}`}</Action>
          {error && (
            <AppText accessibilityRole="alert">
              The dialer couldn’t open. You can dial the number shown above.
            </AppText>
          )}
        </Surface>
      )}
      {region === 'elsewhere' && (
        <AppText>
          Contact a local crisis helpline, your local emergency services, or a trusted person
          nearby. These numbers vary by country.
        </AppText>
      )}
      <AppText variant="bodySmall" tone="secondary">
        Solace is an AI companion, not a substitute for professional care. Support information is
        available here even without an internet connection.
      </AppText>
    </Screen>
  );
}
