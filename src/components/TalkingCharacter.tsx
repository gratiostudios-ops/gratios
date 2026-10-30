import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { fonts } from '../theme';

export type MouthShape = 'smile' | 'small' | 'round' | 'open' | 'wide';

// Five matching poses from ref/emotes; keep every image mounted to avoid frame flicker.
const frames = {
  smile: require('../../assets/character/smile.png'),
  small: require('../../assets/character/small.png'),
  round: require('../../assets/character/round.png'),
  open: require('../../assets/character/open.png'),
  wide: require('../../assets/character/wide.png'),
};

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
  const hat = useRef(new Animated.Value(sleeping ? 1 : 0)).current;
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
      if (reduceMotion) { hat.setValue(0); sink.setValue(0); return; }
      const animation = Animated.parallel([
        Animated.timing(hat, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(sink, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      ]);
      animation.start();
      return () => animation.stop();
    }
    if (reduceMotion) { hat.setValue(1); sink.setValue(1); setSettled(true); return; }
    const animation = Animated.sequence([
      Animated.delay(150),
      Animated.timing(hat, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sink, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]);
    animation.start(({ finished }) => { if (finished) setSettled(true); });
    return () => animation.stop();
  }, [hat, reduceMotion, sink, sleepingPose]);
  const wake = () => {
    if (!sleeping) return;

    if (wakeTimer.current) clearTimeout(wakeTimer.current);
    setAwake(true);
    onWake?.();
    wakeTimer.current = setTimeout(() => { wakeTimer.current = null; setAwake(false); onSleep?.(); }, 3000);
  };
  return <Pressable accessibilityRole="button" accessibilityLabel="Wake assistant" accessibilityHint="The assistant briefly wakes and asks what you need"
    accessibilityState={{ disabled: !sleeping }} disabled={!sleeping} onPress={wake} hitSlop={6} style={styles.character}>
    <View style={styles.wallClip}>
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: sink.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]}>
    {(Object.keys(frames) as MouthShape[]).map(shape => <Image key={shape} source={frames[shape]} fadeDuration={0}
      resizeMode="contain" resizeMethod="resize" style={[styles.frame, { opacity: shape === mouth ? 1 : 0 }]} />)}
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: hat }]}>
      <Svg width={58} height={58} viewBox="0 0 58 58">
        <Path d="M26 30 Q34 27 45 31 L45 41 Q34 45 26 39 Z" fill="#f5d56f" />
        <Path d="M31 35 Q35 37 40 35" stroke="#251b16" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: hat, transform: [{ translateY: hat.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
      <Svg width={58} height={58} viewBox="0 0 58 58">
        <Defs><LinearGradient id="sleepHat" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#168fee" /><Stop offset="1" stopColor="#075b9d" /></LinearGradient></Defs>
        <Path d="M18 13 L39 3 L59 31 L53 37 Q37 24 18 27 Z" fill="url(#sleepHat)" stroke="#050506" strokeWidth={1} strokeLinejoin="round" />
        <Path d="M20 14 L39 5 L55 28 Q39 16 20 18 Z" fill="#199ff8" />
        <Path d="M19 26 Q34 22 53 36" stroke="#053e71" strokeWidth={1.2} fill="none" />
      </Svg>
    </Animated.View>
    </Animated.View>
    </View>
    {settled && [0, 1, 2].map(index => <SleepZ key={index} index={index} flow={flow} reduceMotion={reduceMotion} />)}
    {settled && <SleepZ index={3} occasional flow={flow} reduceMotion={reduceMotion} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  character: { width: 58, height: 58, flexShrink: 0 },
  wallClip: { width: 58, height: 58, overflow: 'hidden' },
  frame: { position: 'absolute', width: 82, height: 82, left: -12, top: -12 },
  sleepZ: { position: 'absolute', left: 43, top: 5, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: '#a6a6a6' },
});
