import React, { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buttonPressHaptic } from '../haptics';
import HomeIcon from '../../assets/phosphor/home.svg';
import MarketplaceIcon from '../../assets/phosphor/storefront.svg';
import ProfileIcon from '../../assets/phosphor/profile.svg';

export type Destination = 'home' | 'profile';
export type MenuActions = { onOpenMenu: () => void };
const destinations = [
  { id: 'home', label: 'Home', Glyph: HomeIcon },
  { id: 'marketplace', label: 'Marketplace, coming soon', Glyph: MarketplaceIcon },
  { id: 'profile', label: 'Profile', Glyph: ProfileIcon },
] as const;

function NavigationItem({ destination, selected, onSelect }: { destination: typeof destinations[number]; selected: boolean; onSelect: (destination: Destination) => void }) {
  const { id, label, Glyph } = destination;
  const scale = useRef(new Animated.Value(1)).current;
  const grow = (value: number) => Animated.spring(scale, { toValue: value, speed: 30, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start();
  const disabled = id === 'marketplace';
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled}
    onPressIn={() => grow(1.08)} onPressOut={() => grow(1)}
    onPress={() => { if (id !== 'marketplace') { buttonPressHaptic(); onSelect(id); } }} style={styles.bottomItem}>
    <Animated.View style={[styles.selection, selected && styles.selected, { transform: [{ scale }] }]}>
      <Glyph width={24} height={24} color={selected ? '#ffffff' : '#929292'} />
    </Animated.View>
  </Pressable>;
}

export function BottomNavigation({ active, onSelect }: { active: Destination; onSelect: (destination: Destination) => void }) {
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={[styles.bottomBar, { paddingBottom: Math.min(28, Math.max(8, insets.bottom)), paddingLeft: insets.left + 5, paddingRight: insets.right }]}>
    {destinations.map(destination => <NavigationItem key={destination.id} destination={destination} selected={active === destination.id} onSelect={onSelect} />)}
  </View>;
}

const styles = StyleSheet.create({
  bottomBar: { height: 78, flexShrink: 0, flexDirection: 'row', paddingTop: 4, backgroundColor: '#0d0d0d' },
  bottomItem: { flex: 1, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  selection: { width: 65, height: 42, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#2d2d2d' },
});
