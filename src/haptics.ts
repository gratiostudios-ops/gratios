import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** A single short, soft pulse for completed taps; never a vibration pattern. */
export function buttonPressHaptic() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  } else if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => {});
  }
}

/** Lighter feedback for navigation, choices, and switches. */
export function navigationHaptic() {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick).catch(() => {});
  } else if (Platform.OS === 'ios') {
    void Haptics.selectionAsync().catch(() => {});
  }
}
