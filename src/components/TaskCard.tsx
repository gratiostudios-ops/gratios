import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Task } from '../data/types';
import { buttonPressHaptic } from '../haptics';
import { colors, fonts } from '../theme';
import { AppText } from './UI';

const completionDuration = 1000;
const AnimatedPath = Animated.createAnimatedComponent(Path);

export function TaskCard({ task, onComplete, error }: { task: Task; onComplete: (id: string) => boolean | Promise<boolean>; error?: string }) {
  const [checked, setChecked] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const checkmark = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const color = task.kind === 'calendar' ? colors.calendar : colors.task;

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
    animation.current?.stop();
  }, []);

  const complete = () => {
    if (pending.current) return;
    pending.current = true;
    setChecked(true);
    animation.current = Animated.parallel([
      Animated.timing(checkmark, {
        toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.timing(progress, {
        toValue: 1, duration: completionDuration, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.current.start();
    // Keep the completed state visible for one second before updating the source.
    timer.current = setTimeout(() => {
      timer.current = null;
      void (async()=>{
        let success=false;
        try{success=await onComplete(task.id);}finally{
          if(!success){animation.current?.stop();progress.setValue(0);checkmark.setValue(0);pending.current=false;setChecked(false);}
        }
      })();
    }, completionDuration);
  };

  return <Animated.View style={checked ? {
    opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, -3] }) }],
  } : undefined}>
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={task.title}
      accessibilityState={{ checked, disabled: checked }} disabled={checked} onPress={complete}
      onPressIn={() => {
        if (checked) return;
        buttonPressHaptic();
        Animated.spring(pressScale, { toValue: 0.982, speed: 40, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
      }}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, speed: 35, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start()}
      style={({ pressed }) => [styles.card, { backgroundColor: color }, pressed && !checked && { opacity: 0.9 }]}>
      <Animated.View style={[styles.checkbox, checked && styles.checkedBox, checked && {
        transform: [{ scale: progress.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0.94, 1, 1] }) }],
      }]}>
        {checked && <Svg width={12} height={12} viewBox="0 0 12 12">
          <AnimatedPath d="M2 6.2 4.6 8.6 10 3.2" fill="none" stroke={color} strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 14"
            strokeDashoffset={checkmark.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })} />
        </Svg>}
      </Animated.View>
      <Animated.View style={[styles.copy, checked && {
        opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.85, 0.85] }),
      }]}>
        <AppText numberOfLines={1} ellipsizeMode="tail" style={styles.title}>{task.title}</AppText>
        {task.due ? <AppText style={styles.due}>{task.due}</AppText> : null}
      </Animated.View>
    </Pressable>
    </Animated.View>
    {error ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.body, padding: 8 }}>{error}</AppText> : null}
  </Animated.View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 45, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 18, overflow: 'hidden' },
  checkbox: { width: 16, height: 16, borderWidth: 2, borderColor: '#f3f3f3', borderRadius: 4, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  checkedBox: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  copy: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 19, letterSpacing: 0.16, color: '#f5f3ee' },
  due: { fontSize: 11, lineHeight: 13, color: '#f5f3ee', marginTop: 2 },
});
