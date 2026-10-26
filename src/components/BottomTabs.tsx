import React from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomTabHeight, colors, fonts } from '../theme';
import { buttonPressHaptic } from '../haptics';
import { Icon } from './Icons';
import { AppText } from './UI';

export type Tab = 'home' | 'suggestions' | 'profile';
const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'suggestions', label: 'Suggestions' }, { id: 'profile', label: 'Profile' },
];

export function BottomTabs({ active, onChange, onContact }: { active: Tab; onChange: (tab: Tab) => void; onContact: () => void }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.tabs, { height: bottomTabHeight(insets.bottom), paddingBottom: Math.max(7, insets.bottom) }]}>
    <View accessibilityRole="tablist" style={styles.tabRow}>
      {tabs.map(tab => <TabButton key={tab.id} tab={tab} selected={active === tab.id} onPress={() => onChange(tab.id)} />)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Contact us" onPress={onContact} hitSlop={6}>
      <AppText style={styles.contact}>Contact us</AppText>
    </Pressable>
  </View>;
}

function TabButton({ tab, selected, onPress }: { tab: { id: Tab; label: string }; selected: boolean; onPress: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    buttonPressHaptic();
    Animated.spring(scale, { toValue: 0.982, speed: 40, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const pressOut = () => Animated.spring(scale, { toValue: 1, speed: 35, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start();
  return <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={onPress}
      onPressIn={pressIn} onPressOut={pressOut} style={({ pressed }) => [styles.tab, pressed && { opacity: 0.92 }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={tab.id} color={selected ? '#ffffff' : '#929292'} />
      </Animated.View>
  </Pressable>;
}
const styles = StyleSheet.create({
  tabs: { backgroundColor: colors.background, paddingTop: 7, justifyContent: 'space-between', alignItems: 'center' },
  tabRow: { flexDirection: 'row', alignSelf: 'stretch' },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  contact: { fontFamily: fonts.interface, fontSize: 13, lineHeight: 17, height: 26, color: '#5b5b5b' },
});
