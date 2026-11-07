import { useScreenBack } from '../../lib/useScreenBack';
import { Action, Surface } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { PageHeader } from '../../components/ui/layout';
import { PrivacyChoice } from './PrivacyChoice';

export function PrivacyScreen() {
  const goBack = useScreenBack('/you');
  return (
    <Screen>
      <PageHeader title="Privacy" back={goBack} />
      <Surface>
        <Icon name="privacy" />
        <PrivacyChoice />
        <Action secondary onPress={goBack}>
          Done
        </Action>
      </Surface>
    </Screen>
  );
}
