import React, { useEffect, useRef } from 'react';
import { Animated, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buttonPressHaptic } from '../haptics';
import { colors, fonts, layout } from '../theme';
import { Icon } from './Icons';
import { AppText } from './UI';

export type Destination = 'home' | 'suggestions' | 'profile';
export type MenuActions = { onOpenMenu: () => void };
const destinations: { id: Destination; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'suggestions', label: 'Suggestions' }, { id: 'profile', label: 'Profile' },
];

export function NavigationButton({ onOpenMenu, keyboardActive = false }: MenuActions & { keyboardActive?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityLabel="Open navigation menu" onPress={onOpenMenu}
    onPressIn={() => {
      buttonPressHaptic();
      Animated.spring(scale, { toValue: 0.982, speed: 40, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    }}
    onPressOut={() => Animated.spring(scale, { toValue: 1, speed: 35, bounciness: 4, useNativeDriver: Platform.OS !== 'web' }).start()}
    style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.92 }]}>
    {keyboardActive && <View pointerEvents="none" style={styles.activeBorder} />}
    <Animated.View style={[styles.hamburger, { transform: [{ scale }] }]}>
      {[0, 1, 2].map(index => <View key={index} style={[styles.line, keyboardActive && { backgroundColor: '#ffffff' }]} />)}
    </Animated.View>
  </Pressable>;
}

export function FloatingNavigation(props: MenuActions) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.floatingButton, { bottom: Math.max(8, insets.bottom) + 11, left: insets.left + layout.gutter }]}>
    <NavigationButton {...props} />
  </View>;
}

export function NavigationSheet({ visible, active, onClose, onSelect, onContact }: {
  visible: boolean; active: Destination; onClose: () => void; onSelect: (destination: Destination) => void; onContact: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const afterDismiss = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    Keyboard.dismiss();
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [progress, visible]);
  const close = (after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) {
        if (Platform.OS === 'ios') afterDismiss.current = after ?? null;
        onClose();
        if (Platform.OS !== 'ios') after?.();
      }
    });
  };
  return <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}
    onDismiss={() => { const action = afterDismiss.current; afterDismiss.current = null; action?.(); }}>
    {visible && <StatusBar hidden={false} style="light" />}
    <View style={styles.modal}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.48] }) }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu" style={StyleSheet.absoluteFill} onPress={() => close()} />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, {
        marginBottom: Math.max(8, insets.bottom), maxHeight: Math.max(120, height - insets.top - insets.bottom - 32),
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
      }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeading}><AppText accessibilityRole="header" style={styles.brand}>Avocado</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu" onPress={() => close()} style={styles.closeButton}><AppText style={styles.closeText}>×</AppText></Pressable>
        </View>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.destinations}>{destinations.map(destination => <Pressable key={destination.id} accessibilityRole="button" accessibilityState={{ selected: active === destination.id }}
            onPressIn={buttonPressHaptic} onPress={() => close(() => onSelect(destination.id))}
            style={({ pressed }) => [styles.destination, active === destination.id && styles.selected, pressed && { opacity: 0.75 }]}>
            <View style={styles.destinationIcon}><Icon name={destination.id} color={active === destination.id ? '#ffffff' : '#a6a6a6'} /></View>
            <AppText style={[styles.destinationLabel, active === destination.id && { color: '#ffffff' }]}>{destination.label}</AppText>
          </Pressable>)}</View>
          <Pressable accessibilityRole="button" onPressIn={buttonPressHaptic} onPress={() => close(onContact)} style={({ pressed }) => [styles.contact, pressed && { opacity: 0.65 }]}><AppText style={styles.contactText}>Contact us</AppText></Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  menuButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeBorder: { ...StyleSheet.absoluteFill, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  hamburger: { width: 20, height: 16, justifyContent: 'space-between' },
  line: { width: 20, height: 2, borderRadius: 1, backgroundColor: '#bdbdbd' },
  floatingButton: { position: 'absolute', zIndex: 15 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  sheet: { marginHorizontal: 12, borderRadius: 28, backgroundColor: '#222222', paddingHorizontal: 16, paddingBottom: 12, overflow: 'hidden' },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#555555', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  brand: { fontFamily: fonts.semibold, fontSize: 25, lineHeight: 30 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, lineHeight: 32, color: '#bdbdbd' },
  destinations: { marginTop: 8, gap: 8 },
  destination: { minHeight: 52, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', gap: 16, alignItems: 'center' },
  destinationIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#363636' },
  destinationLabel: { color: '#bdbdbd', fontFamily: fonts.medium, fontSize: 16, lineHeight: 21 },
  contact: { marginTop: 12, minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
  contactText: { color: colors.secondary, fontSize: 14, lineHeight: 19 },
});
