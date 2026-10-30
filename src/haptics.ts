import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function buttonPressHaptic() {
  if (Platform.OS === 'ios') {
    void Haptics.selectionAsync().catch(() => {});
  } else if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick).catch(() => {});
  }
}

/** Softer feedback for tab changes; native presets do not expose percentage strength. */
export function navigationHaptic() {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick).catch(() => {});
  } else if (Platform.OS === 'ios') {
    void Haptics.selectionAsync().catch(() => {});
  }
}
