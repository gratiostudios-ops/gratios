import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.42)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.42, duration: 800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return <Animated.View accessibilityElementsHidden style={[styles.block, { opacity }, style]} />;
}

export function MarketplaceDeckSkeleton({ width }: { width: number }) {
  return <View accessibilityLabel="Loading featured agents" accessibilityRole="progressbar" style={{ width, height: width * 0.86, marginTop: 22, alignSelf: 'center' }}>
    <View style={[styles.deckCard, { transform: [{ translateX: 14 }, { rotate: '7deg' }] }]} />
    <View style={[styles.deckCard, { transform: [{ translateX: 7 }, { rotate: '3deg' }] }]} />
    <View style={styles.deckCard}>
      <SkeletonBlock style={styles.art} />
      <View style={styles.caption}>
        <View style={{ flex: 1, gap: 8 }}><SkeletonBlock style={{ height: 14, width: '68%' }} /><SkeletonBlock style={{ height: 10, width: '92%' }} /></View>
        <SkeletonBlock style={{ width: 58, height: 32, borderRadius: 18 }} />
      </View>
    </View>
  </View>;
}

export function MarketplaceRowsSkeleton({ count = 4 }: { count?: number }) {
  return <View accessibilityLabel="Loading marketplace agents" accessibilityRole="progressbar">
    {Array.from({ length: count }, (_, index) => <View key={index} style={styles.row}>
      <SkeletonBlock style={{ width: 56, height: 56, borderRadius: 16 }} />
      <View style={{ flex: 1, gap: 8 }}><SkeletonBlock style={{ height: 14, width: '52%' }} /><SkeletonBlock style={{ height: 10, width: '84%' }} /></View>
      <SkeletonBlock style={{ width: 60, height: 32, borderRadius: 18 }} />
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#555b65', borderRadius: 8 },
  deckCard: { ...StyleSheet.absoluteFill, borderRadius: 42, backgroundColor: '#20242a', overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  art: { ...StyleSheet.absoluteFill, borderRadius: 42 },
  caption: { minHeight: 80, borderRadius: 22, backgroundColor: '#343941', padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  row: { minHeight: 77, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#2b2b2b', paddingVertical: 12 },
});
