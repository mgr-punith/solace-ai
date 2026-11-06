import { Redirect } from 'expo-router';
import { DesignPreviewScreen } from '../features/design-preview/DesignPreviewScreen';

export default function DesignPreviewRoute() {
  return __DEV__ ? <DesignPreviewScreen /> : <Redirect href="/" />;
}
