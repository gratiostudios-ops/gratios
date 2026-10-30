import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MarketListing } from '../data/marketplace';
import { cardRelease } from '../data/card-gesture';
import { carouselTheme } from '../data/carousel-theme';
import { carouselArt } from '../carousel-art';
import { buttonPressHaptic } from '../haptics';
import { fonts } from '../theme';
import { AppText } from './UI';
import { MarketArt } from './MarketplaceUI';

export function MarketplaceDeck({ items, onOpen, installed }: { items: MarketListing[]; onOpen(item: MarketListing): void; installed: Set<string> }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 56, 370);
  const position = useRef(new Animated.ValueXY()).current;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const animating = useRef(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); animation.current?.stop(); };
  }, []);
  const fly = (dx: number, dy: number, vx: number) => {
    if (animating.current || items.length < 2) return;
    const result = cardRelease(dx, dy, vx, width);
    if (!result.dismiss) {
      animation.current = Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 7, tension: 65, useNativeDriver: Platform.OS !== 'web' });
      animation.current.start(); return;
    }
    buttonPressHaptic(); animating.current = true;
    const advance = () => { position.setValue({ x: 0, y: 0 }); setIndex(value => (value + 1) % items.length); animating.current = false; };
    if (reduceMotion) { advance(); return; }
    animation.current = Animated.timing(position, { toValue: { x: result.x, y: result.y }, duration: 260, useNativeDriver: Platform.OS !== 'web' });
    animation.current.start(({ finished }) => { if (finished) advance(); else animating.current = false; });
  };
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !animating.current && items.length > 1 && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderMove: (_, gesture) => { if (!animating.current) position.setValue({ x: gesture.dx, y: gesture.dy * 0.25 }); },
    onPanResponderRelease: (_, gesture) => fly(gesture.dx, gesture.dy * 0.25, gesture.vx),
    onPanResponderTerminate: () => { animation.current = Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }); animation.current.start(); },
  }), [items.length, width, reduceMotion]);
  if (!items.length) return <View style={[styles.empty, { width }]}><AppText style={styles.emptyTitle}>Your next great agent</AppText><AppText style={styles.emptyText}>Featured agents will appear here as creators publish them.</AppText></View>;
  const current = index % items.length;
  const item = items[current];
  const theme = carouselTheme(item);
  const nextTheme = carouselTheme(items[(current + 1) % items.length]);
  const thirdTheme = carouselTheme(items[(current + 2) % items.length]);
  return <View style={{ alignItems: 'center', paddingTop: 22, paddingBottom: 4 }}>
    <View style={{ width, height: 306 }}>
      {items.length > 1 && <View pointerEvents="none" style={[styles.backCard, { transform: [{ rotate: '7deg' }, { scale: 0.94 }], backgroundColor: '#394638' }]}>{nextTheme && <Image source={carouselArt[nextTheme]} resizeMode="cover" style={StyleSheet.absoluteFill} />}</View>}
      {items.length > 2 && <View pointerEvents="none" style={[styles.backCard, { transform: [{ rotate: '-4deg' }, { scale: 0.97 }], backgroundColor: '#66543b' }]}>{thirdTheme && <Image source={carouselArt[thirdTheme]} resizeMode="cover" style={StyleSheet.absoluteFill} />}</View>}
      <Animated.View {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel={'Featured agent ' + (current + 1) + ' of ' + items.length + ': ' + item.name} accessibilityActions={[{ name: 'increment', label: 'Next agent' }]} onAccessibilityAction={() => fly(width, 0, 1)} style={[styles.front, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: position.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-18deg', '0deg', '18deg'], extrapolate: 'clamp' }) }] }]}>
        <LinearGradient colors={['#c98b45', '#633c22', '#241c16']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {theme ? <Image pointerEvents="none" source={carouselArt[theme]} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <View pointerEvents="none" style={styles.glow} />}
        <View pointerEvents="none" style={styles.featureArt}>{!theme && <MarketArt image={item.artwork} size={145} />}</View>
        <View style={styles.caption}><Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={{ flex: 1, gap: 4 }}><AppText numberOfLines={1} style={styles.cardTitle}>{item.name}</AppText><AppText numberOfLines={2} style={styles.description}>{item.description}</AppText></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={(installed.has(item.id) ? 'Manage ' : 'Add ') + item.name} onPress={() => onOpen(item)} style={styles.add}><AppText style={styles.addText}>{installed.has(item.id) ? 'View' : 'Add'}</AppText></Pressable>
        </View>
      </Animated.View>
    </View>
    {items.length > 1 && <View style={styles.controls}><AppText style={styles.hint}>Drag to discover</AppText><View style={styles.dots}>{items.slice(0, 8).map((card, i) => <View key={card.id} style={[styles.dot, current === i && { backgroundColor: '#fff', width: 16 }]} />)}</View><Pressable accessibilityRole="button" accessibilityLabel="Next featured agent" onPress={() => fly(width, 0, 1)} style={styles.next}><AppText style={styles.nextText}>Next ↗</AppText></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({
  front: { ...StyleSheet.absoluteFill, borderRadius: 34, overflow: 'hidden', backgroundColor: '#54341e' }, backCard: { ...StyleSheet.absoluteFill, top: -6, bottom: 6, borderRadius: 34, overflow: 'hidden' }, glow: { width: 230, height: 230, borderRadius: 115, backgroundColor: '#ffdd9a30', position: 'absolute', top: -40, left: -35 }, featureArt: { flex: 1, alignItems: 'center', justifyContent: 'center' }, caption: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, margin: 15, marginTop: 0, borderRadius: 22, borderWidth: 1, borderColor: '#ffffff30', backgroundColor: '#fff2dbea' }, cardTitle: { fontFamily: fonts.bold, fontSize: 17, color: '#19130d' }, description: { color: '#584b3e', fontSize: 12, lineHeight: 16 }, add: { backgroundColor: '#2468f5', borderRadius: 22, minWidth: 62, minHeight: 40, alignItems: 'center', justifyContent: 'center' }, addText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }, controls: { flexDirection: 'row', width: '100%', alignItems: 'center', paddingHorizontal: 10, paddingTop: 15 }, hint: { color: '#666', fontSize: 11, flex: 1 }, dots: { flexDirection: 'row', gap: 5, alignItems: 'center' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#454545' }, next: { flex: 1, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' }, nextText: { color: '#aaa', fontSize: 12 }, empty: { minHeight: 170, borderRadius: 30, backgroundColor: '#191919', padding: 28, justifyContent: 'center', alignSelf: 'center', marginVertical: 22, gap: 8, borderWidth: 1, borderColor: '#292929' }, emptyTitle: { color: '#ddd', fontFamily: fonts.semibold, fontSize: 19 }, emptyText: { color: '#777', fontSize: 14, lineHeight: 21 },
});
