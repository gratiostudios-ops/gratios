import React, { forwardRef } from 'react';
import { Pressable as NativePressable, Switch as NativeSwitch, type PressableProps, type SwitchProps } from 'react-native';
import { buttonPressHaptic, navigationHaptic } from '../haptics';

/** Preserve native press behavior; cancelled gestures and disabled controls never pulse. */
export const HapticPressable = forwardRef<React.ComponentRef<typeof NativePressable>, PressableProps>(function HapticPressable({ onPress, disabled, accessibilityRole, accessibilityState, ...props }, ref) {
  return <NativePressable {...props} ref={ref} disabled={disabled} accessibilityRole={accessibilityRole} accessibilityState={accessibilityState}
    onPress={onPress ? event => {
      if (disabled || accessibilityState?.disabled) return;
      const selection = ['checkbox', 'radio', 'switch'].includes(accessibilityRole ?? '');
      if (accessibilityRole !== 'tab' || !accessibilityState?.selected) {
        if (selection) navigationHaptic(); else buttonPressHaptic();
      }
      onPress(event);
    } : undefined} />;
});

export const HapticSwitch = forwardRef<React.ComponentRef<typeof NativeSwitch>, SwitchProps>(function HapticSwitch({ onValueChange, disabled, ...props }, ref) {
  return <NativeSwitch {...props} ref={ref} disabled={disabled} onValueChange={onValueChange ? value => {
    if (disabled) return;
    navigationHaptic();
    onValueChange(value);
  } : undefined} />;
});
