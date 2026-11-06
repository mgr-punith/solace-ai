import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, View } from 'react-native';
import { tokens } from '../../theme/tokens';
import type { SolProps } from './types';

const getComponent = () => import('./SolDrawing');
export default function Sol(props: SolProps) {
  const size = props.size ?? tokens.sol.hero;
  return (
    <WithSkiaWeb
      getComponent={getComponent}
      componentProps={props}
      opts={{ locateFile: () => '/canvaskit.wasm' }}
      fallback={
        <View style={{ width: size, height: size, justifyContent: 'center' }}>
          <ActivityIndicator accessibilityLabel="Drawing Sol" color={tokens.colors.face} />
        </View>
      }
    />
  );
}
