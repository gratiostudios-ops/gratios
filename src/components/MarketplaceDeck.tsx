import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, PanResponder, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import type { MarketListing } from '../data/marketplace';
import { cardRelease } from '../data/card-gesture';
import { marketplaceCover, preloadMarketplaceCovers } from '../marketplace-covers';
import { buttonPressHaptic } from '../haptics';
import { fonts } from '../theme';
import { AppText } from './UI';
import { MarketButton } from './MarketplaceUI';

export function MarketplaceDeck({ items, onOpen, onAdd, installed }: { items: MarketListing[]; onOpen(item: MarketListing): void; onAdd?(item: MarketListing): void; installed: Set<string> }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 79, 370);
  const position = useRef(new Animated.ValueXY()).current;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const animating = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  // Reset only after React promotes the next keyed card, avoiding a flash
  // of the dismissed card returning to the center before it unmounts.
  useLayoutEffect(() => {
    position.setValue({ x: 0, y: 0 });
    animating.current = false;
  }, [index, position]);
  const promotion = position.x.interpolate({
    inputRange: [-width * 0.85, 0, width * 0.85],
    outputRange: [1, 0, 1], extrapolate: 'clamp',
  });
  const snapBack = () => {
    animation.current = Animated.spring(position, { toValue: { x: 0, y: 0 }, stiffness: 280, damping: 28, mass: 0.85, useNativeDriver: Platform.OS !== 'web' });
    animation.current.start();
  };
  useEffect(() => {
    let active = true;
    void preloadMarketplaceCovers().catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); animation.current?.stop(); };
  }, []);
  const fly = (dx: number, dy: number, vx: number) => {
    if (animating.current || index >= items.length) return;
    const result = cardRelease(dx, dy, vx, width);
    if (!result.dismiss) {
      if (reduceMotion) position.setValue({ x: 0, y: 0 }); else snapBack();
      return;
    }
    buttonPressHaptic(); animating.current = true;
    const advance = () => { setIndex(value => Math.min(value + 1, items.length)); };
    if (reduceMotion) { advance(); return; }
    animation.current = Animated.timing(position, { toValue: { x: result.x, y: result.y }, duration: Math.max(160, 260 - Math.abs(vx) * 35), easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.current.start(({ finished }) => { if (finished) advance(); else animating.current = false; });
  };
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !animating.current && index < items.length && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderGrant: () => { animation.current?.stop(); },
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => { if (!animating.current) position.setValue({ x: gesture.dx, y: gesture.dy * 0.25 }); },
    onPanResponderRelease: (_, gesture) => fly(gesture.dx, gesture.dy * 0.25, gesture.vx),
    onPanResponderTerminate: () => { if (!animating.current) snapBack(); },
  }), [index, items.length, width, reduceMotion]);
  if (!items.length) return <View style={[styles.empty, { width }]}><AppText style={styles.emptyTitle}>Your next great agent</AppText><AppText style={styles.emptyText}>Featured agents will appear here as creators publish them.</AppText></View>;
  if (index >= items.length) return <View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 4 }}><View style={[styles.empty, styles.caughtUp, { width, height: width * 0.86, marginVertical: 0, alignItems: 'center' }]}><Svg pointerEvents="none" width={width} height={width * 0.86} style={StyleSheet.absoluteFill}><Rect x={1} y={1} width={width - 2} height={width * 0.86 - 2} rx={44} fill="none" stroke="#3A3A3A" strokeWidth={1} strokeDasharray={[30, 20]} /></Svg><AppText accessibilityRole="header" style={styles.emptyTitle}>You're all caught up</AppText><AppText style={styles.emptyText}>You've explored all {items.length} agents.</AppText><MarketButton label="Reload" onPress={() => { position.setValue({ x: 0, y: 0 }); setIndex(0); }} /></View></View>;
  // Keep five cards mounted for preloading; reveal only the front two.
  const visible = items.slice(index, index + 5);
  return <View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 4 }}>
    <View style={{ width, height: width * 0.86 }}>
      {visible.map((item, offset) => <Animated.View key={item.id} {...(offset === 0 ? responder.panHandlers : {})}
        pointerEvents={offset === 0 ? 'auto' : 'none'} accessibilityElementsHidden={offset !== 0} importantForAccessibility={offset === 0 ? 'auto' : 'no-hide-descendants'}
        accessibilityRole="adjustable" accessibilityLabel={'Featured agent ' + (index + offset + 1) + ' of ' + items.length + ': ' + item.name}
        accessibilityActions={offset === 0 ? [{ name: 'increment', label: 'Next agent' }] : []} onAccessibilityAction={() => { if (offset === 0) fly(width, 0, 1); }}
        style={[styles.front, { opacity: offset < 2 ? 1 : offset === 2 ? promotion : 0, zIndex: visible.length - offset, transform: offset === 0 ? [{ translateX: position.x }, { translateY: position.y }, { rotate: position.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' }) }] : [{ translateX: promotion.interpolate({ inputRange: [0, 1], outputRange: [Math.min(offset, 3) * 14, Math.min(offset - 1, 3) * 14] }) }, { rotate: promotion.interpolate({ inputRange: [0, 1], outputRange: [offset % 2 ? '9deg' : '7deg', offset === 1 ? '0deg' : (offset - 1) % 2 ? '9deg' : '7deg'] }) }, { scale: promotion.interpolate({ inputRange: [0, 1], outputRange: [1 - Math.min(offset, 3) * 0.02, 1 - Math.min(offset - 1, 3) * 0.02] }) }, { translateY: promotion.interpolate({ inputRange: [0, 1], outputRange: [-Math.min(offset, 3) * 4, -Math.min(offset - 1, 3) * 4] }) }] }]}>
        <GlassCardSurface item={item}><Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={{ flex: 1, minWidth: 0, gap: 4 }}><AppText numberOfLines={2} style={styles.cardTitle}>{item.name}</AppText><AppText numberOfLines={2} style={styles.description}>{item.description}</AppText></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={(installed.has(item.id) ? 'Manage ' : 'Add ') + item.name} onPress={() => (onAdd ?? onOpen)(item)} style={styles.add}><AppText style={styles.addText}>{installed.has(item.id) ? 'Added' : 'Add'}</AppText></Pressable>
        </GlassCardSurface>
      </Animated.View>)}
    </View>

  </View>;
}
// Figma reference: light -45° / 80%, refraction 80, depth 20,
// dispersion 50, splay 0; updated with stronger frosting and a 65% cool grey fill. Optical properties are approximated
// with background blur, diagonal reflection, and a subtly chromatic rim.
function GlassCardSurface({ item, children }: { item: MarketListing; children: React.ReactNode }) {
  const target = useRef<React.ComponentRef<typeof View>>(null);
  return <>
    <BlurTargetView ref={target} collapsable={false} style={styles.cardArtwork}>
      <Image pointerEvents="none" source={item.cover?.uri ? { uri: item.cover.uri } : marketplaceCover(item.id, item.artwork)} resizeMode="cover" fadeDuration={0} style={styles.coverImage} />
    </BlurTargetView>
    <View style={styles.caption}>
      <BlurView pointerEvents="none" blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={30} tint="default" style={styles.glassLayer} />
      <View pointerEvents="none" style={[styles.glassLayer, { backgroundColor: 'rgba(205, 209, 214, 0.65)' }]} />
      <LinearGradient pointerEvents="none" colors={['#ffffff12', '#ffffff04', '#ffffff00', '#ffffff08']} locations={[0, 0.28, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.glassLayer} />
      <View pointerEvents="none" style={styles.glassRim} />
      {children}
    </View>
  </>;
}
const styles = StyleSheet.create({
  caughtUp: { backgroundColor: '#111111', borderWidth: 0 },
  glassLayer: { ...StyleSheet.absoluteFill, borderRadius: 21 },
  cardArtwork: { ...StyleSheet.absoluteFill, borderRadius: 44, borderCurve: 'continuous', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', transform: [{ scale: 1.05 }] },
  glassRim: { ...StyleSheet.absoluteFill, borderRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderBottomWidth: 1, borderRightWidth: 1, borderTopColor: '#ffffff30', borderLeftColor: '#ffffff20', borderBottomColor: '#ffffff10', borderRightColor: '#ffffff10' },
  front: { ...StyleSheet.absoluteFill, borderRadius: 44, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#85898e' }, backCard: { ...StyleSheet.absoluteFill, top: -6, bottom: 6, borderRadius: 44, borderCurve: 'continuous', overflow: 'hidden' }, featureArt: { flex: 1, alignItems: 'center', justifyContent: 'center' }, caption: { flexDirection: 'row', gap: 12, alignItems: 'center', position: 'absolute', bottom: 19, left: 16, right: 16, minHeight: 80, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 21, borderWidth: 1, borderColor: '#ffffff26', backgroundColor: 'transparent', overflow: 'hidden' }, cardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: '#080808' }, description: { color: '#5F6368', fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 }, add: { backgroundColor: '#2468f5', borderRadius: 22, minWidth: 58, minHeight: 32, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }, addText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }, controls: { flexDirection: 'row', width: '100%', alignItems: 'center', paddingHorizontal: 10, paddingTop: 15 }, hint: { color: '#666', fontSize: 11, flex: 1 }, dots: { flexDirection: 'row', gap: 5, alignItems: 'center' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#454545' }, next: { flex: 1, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' }, nextText: { color: '#aaa', fontSize: 12 }, empty: { minHeight: 170, borderRadius: 44, borderCurve: 'continuous', backgroundColor: '#191919', padding: 28, justifyContent: 'center', alignSelf: 'center', marginVertical: 22, gap: 8, borderWidth: 1, borderColor: '#292929' }, emptyTitle: { color: '#ddd', fontFamily: fonts.semibold, fontSize: 19 }, emptyText: { color: '#777', fontSize: 14, lineHeight: 21 },
});
