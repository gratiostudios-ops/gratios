import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type TextProps, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { Action } from '../data/types';

export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}

export function ActionChip({ action, onPress, disabled = false }: { action: Action; onPress: (message: string) => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={action.label} disabled={disabled}
    onPress={() => onPress(action.message)} style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && { opacity: 0.5 }]}>
    <AppText numberOfLines={1} style={styles.chipText}>{action.label}</AppText>
  </Pressable>;
}

function Dot({ index }: { index: number }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(index * 150),
      Animated.timing(motion, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.delay(650 - index * 150),
    ]));
    animation.start();
    return () => animation.stop();
  }, [index, motion]);
  return <Animated.View style={[styles.dot, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]} />;
}

export function TypingIndicator() {
  return <View accessible accessibilityLabel="Agent is thinking" accessibilityRole="progressbar" style={styles.dots}>
    {[0, 1, 2].map(index => <Dot key={index} index={index} />)}
  </View>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.regular, color: colors.text, fontSize: 14, lineHeight: 17, includeFontPadding: false },
  chip: { minHeight: 33, maxWidth: '100%', paddingHorizontal: 21, paddingVertical: 7, borderWidth: 1, borderColor: colors.chip, borderRadius: 19, alignSelf: 'flex-start', justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 17, color: colors.chip },
  pressed: { opacity: 0.65 },
  dots: { flexDirection: 'row', gap: 5, paddingHorizontal: 8, height: 40, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.body },
});
