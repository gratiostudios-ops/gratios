import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { fonts } from '../theme';

export type MouthShape = 'smile' | 'small' | 'round' | 'open' | 'wide';

// Five matching poses from ref/emotes; keep every image mounted to avoid frame flicker.
const frames = {
  smile: require('../../assets/character/wizard_E.png'),
  small: require('../../assets/character/wizard_I.png'),
  round: require('../../assets/character/wizard_O.png'),
  open: require('../../assets/character/wizard_A.png'),
  wide: require('../../assets/character/wizard_U.png'),
};
const sleepingFrame = require('../../assets/character/wizard_sleeping.png');

export function mouthForWord(word: string): MouthShape {
  if (/[ou]/i.test(word)) return 'round';
  if (/a/i.test(word)) return 'open';
  if (/[eiy]/i.test(word)) return 'wide';
  return 'small';
}

function SleepZ({ index, reduceMotion, flow, occasional = false }: {
  index: number; reduceMotion: boolean; flow: Animated.Value; occasional?: boolean;
}) {
  const rareDrift = useRef(new Animated.Value(0)).current;
  const drift = useMemo(() => occasional ? rareDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : Animated.modulo(Animated.add(flow, index / 3), 1).interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), [flow, index, occasional, rareDrift]);
  useEffect(() => {
    if (reduceMotion || !occasional) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(9800),
      Animated.timing(rareDrift, { toValue: 1, duration: 3400, easing: Easing.linear, isInteraction: false, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(rareDrift, { toValue: 0, duration: 0, isInteraction: false, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [occasional, rareDrift, reduceMotion]);
  if (reduceMotion && (index > 0 || occasional)) return null;
  return <Animated.Text style={[styles.sleepZ, {
    opacity: reduceMotion ? 0.6 : drift.interpolate({ inputRange: [0, 0.18, 0.65, 1], outputRange: [0, 0.65, 0.5, 0] }),
    transform: [
      { translateY: reduceMotion ? -8 : drift.interpolate({ inputRange: [0, 1], outputRange: [6, occasional ? -42 : -30] }) },
      { translateX: reduceMotion ? 0 : drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: occasional ? [0, 5, 14] : [0, 4, 11] }) },
      { scale: reduceMotion ? 1 : drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: occasional ? [0.55, 1.15, 2] : [0.65, 0.9, 1.2] }) },
    ],
  }]}>z</Animated.Text>;
}

export function TalkingCharacter({ mouth, sleeping = false, reduceMotion = false, onWake, onSleep }: {
  mouth: MouthShape; sleeping?: boolean; reduceMotion?: boolean;
  onWake?: () => void; onSleep?: () => void;
}) {
  const sink = useRef(new Animated.Value(sleeping ? 1 : 0)).current;
  const [settled, setSettled] = useState(sleeping);
  const [awake, setAwake] = useState(false);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flow = useRef(new Animated.Value(0)).current;
  const sleepingPose = sleeping && !awake;
  useEffect(() => () => { if (wakeTimer.current) clearTimeout(wakeTimer.current); }, []);
  useEffect(() => {
    if (!settled || reduceMotion) return;
    flow.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(flow, { toValue: 1, duration: 3000, easing: Easing.linear, isInteraction: false, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(flow, { toValue: 0, duration: 0, isInteraction: false, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [flow, reduceMotion, settled]);
  useEffect(() => {
    if (!sleepingPose) {
      setSettled(false);
      if (reduceMotion) { sink.setValue(0); return; }
      const animation = Animated.timing(sink, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
      animation.start();
      return () => animation.stop();
    }
    if (reduceMotion) { sink.setValue(1); setSettled(true); return; }
    const animation = Animated.sequence([
      Animated.delay(150),
      Animated.timing(sink, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]);
    animation.start(({ finished }) => { if (finished) setSettled(true); });
    return () => animation.stop();
  }, [reduceMotion, sink, sleepingPose]);
  const wake = () => {
    if (!sleeping) return;

    if (wakeTimer.current) clearTimeout(wakeTimer.current);
    setAwake(true);
    onWake?.();
    wakeTimer.current = setTimeout(() => { wakeTimer.current = null; setAwake(false); onSleep?.(); }, 3000);
  };
  const visibleHeight = sleepingPose ? 58 : 63.8;
  return <Pressable accessibilityRole="button" accessibilityLabel="Wake assistant" accessibilityHint="The assistant briefly wakes and asks what you need"
    accessibilityState={{ disabled: !sleeping }} disabled={!sleeping} onPress={wake} hitSlop={6} style={[styles.character, { height: visibleHeight }]}>
    <View style={[styles.wallClip, { height: visibleHeight }]}>
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: sink.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]}>
    {(Object.keys(frames) as MouthShape[]).map(shape => <Image key={shape} source={frames[shape]} fadeDuration={0}
      resizeMode="contain" resizeMethod="resize" style={[styles.frame, { opacity: sleepingPose ? 0 : shape === mouth ? 1 : 0 }]} />)}
    <Image source={sleepingFrame} fadeDuration={0} resizeMode="contain" resizeMethod="resize"
      style={[styles.frame, { opacity: sleepingPose ? 1 : 0 }]} />
    </Animated.View>
    </View>
    {settled && [0, 1, 2].map(index => <SleepZ key={index} index={index} flow={flow} reduceMotion={reduceMotion} />)}
    {settled && <SleepZ index={3} occasional flow={flow} reduceMotion={reduceMotion} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  character: { width: 72.5, height: 58, flexShrink: 0, transform: [{ translateY: 9 }] },
  wallClip: { width: 72.5, height: 58, overflow: 'hidden' },
  frame: { position: 'absolute', width: 72.5, height: 72.5, left: 0, top: 0 },
  sleepZ: { position: 'absolute', left: 55, top: 5, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: '#a6a6a6' },
});
