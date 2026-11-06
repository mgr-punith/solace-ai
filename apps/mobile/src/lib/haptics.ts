import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function gentleHaptic(enabled: boolean, kind: 'tap' | 'selection' = 'tap') {
  if (!enabled) return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(
        kind === 'tap'
          ? Haptics.AndroidHaptics.Gesture_End
          : Haptics.AndroidHaptics.Segment_Frequent_Tick,
      );
    } else if (Platform.OS === 'ios') {
      if (kind === 'selection') await Haptics.selectionAsync();
      else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
  } catch {
    // Haptics are optional; unsupported hardware must not interrupt an action.
  }
}
