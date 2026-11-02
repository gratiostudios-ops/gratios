import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { connectionOptions, toggleConnection, type ConnectionId } from '../data/connection-options';
import { fonts } from '../theme';
import { AppText } from './UI';
import { HapticPressable } from './HapticControls';
import { PhosphorIcon } from './PhosphorIcon';

type Option = typeof connectionOptions[number];
function ConnectionApp({ option, selected, disabled, onPress }: { option: Option; selected: boolean; disabled: boolean; onPress(): void }) {
  const entrance = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    const animation = Animated.spring(entrance, { toValue: 1, stiffness: 260, damping: 24, useNativeDriver: Platform.OS !== 'web' });
    animation.start(); return () => animation.stop();
  }, [entrance]);
  return <Animated.View style={{ transform: [{ scale: entrance }] }}>
    <HapticPressable accessibilityRole="checkbox" accessibilityLabel={option.name} accessibilityHint={selected ? 'Remove from chosen connections' : 'Add to chosen connections'} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.app, pressed && { opacity: 0.7 }]}>
      <View style={[styles.icon, selected && styles.selectedIcon]}>
        {option.id === 'gmail' || option.id === 'calendar'
          ? <Image source={option.id === 'gmail' ? require('../../assets/connectors/gmail.png') : require('../../assets/connectors/calendar.png')} resizeMode="contain" style={{ width: 34, height: 34 }} />
          : <PhosphorIcon name={option.id === 'tasks' ? 'tasks' : 'bell'} size={32} color={option.id === 'tasks' ? '#79a5ff' : '#f4c46c'} />}
        <View style={[styles.badge, selected && styles.selectedBadge]}><PhosphorIcon name={selected ? 'minus' : 'plus'} size={12} color={selected ? '#fff' : '#bcbcbc'} /></View>
      </View>
      <AppText style={[styles.name, selected && { color: '#dedede' }]}>{option.name}</AppText>
    </HapticPressable>
  </Animated.View>;
}
export function ConnectionPicker({ selected, onChange, disabled = false }: { selected: ConnectionId[]; onChange(value: ConnectionId[]): void; disabled?: boolean }) {
  const chosen = selected.flatMap(id => connectionOptions.filter(option => option.id === id));
  const available = connectionOptions.filter(option => !selected.includes(option.id));
  const app = (option: Option, checked: boolean) => <ConnectionApp key={option.id} option={option} selected={checked} disabled={disabled} onPress={() => onChange(toggleConnection(selected, option.id))} />;
  return <View style={styles.picker}>
    <View style={styles.sectionHeader}><AppText style={styles.heading}>Chosen</AppText><AppText style={styles.hint}>Tap − to remove</AppText></View>
    <View style={[styles.chosen, !chosen.length && styles.emptyChosen]}>
      {chosen.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apps}>{chosen.map(option => app(option, true))}</ScrollView>
        : <View style={styles.empty}><PhosphorIcon name="plus" size={24} color="#6d6d6d" /><AppText style={styles.emptyText}>Add the connections you want below</AppText></View>}
    </View>
    <View style={styles.sectionHeader}><AppText style={styles.heading}>Available</AppText><AppText style={styles.hint}>Tap + to add</AppText></View>
    {available.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apps}>{available.map(option => app(option, false))}</ScrollView>
      : <AppText style={styles.emptyText}>All connections chosen. You can remove any above.</AppText>}
    <AppText style={styles.note}>Choose what to set up. Gmail reads unread mail and marks processed messages read. Permissions are requested after sign-in. Calendar and Tasks share one Google connection.</AppText>
  </View>;
}
const styles = StyleSheet.create({
  picker: { gap: 12 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { color: '#dedede', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }, hint: { color: '#777', fontSize: 12, lineHeight: 18 },
  chosen: { minHeight: 140, borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#171717', justifyContent: 'center' },
  emptyChosen: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#333' },
  apps: { alignItems: 'flex-start', gap: 12, paddingHorizontal: 12, paddingVertical: 16 },
  app: { width: 76, alignItems: 'center', gap: 10 },
  icon: { width: 60, height: 60, borderRadius: 19, borderCurve: 'continuous', backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff0d' },
  selectedIcon: { backgroundColor: '#222b3b', borderColor: '#558dff66' },
  badge: { position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#333', borderWidth: 2, borderColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
  selectedBadge: { backgroundColor: '#2468f5', borderColor: '#171717' },
  name: { color: '#929292', fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, textAlign: 'center', minHeight: 34 },
  empty: { alignItems: 'center', gap: 8, padding: 20 }, emptyText: { color: '#6d6d6d', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  note: { color: '#777', fontSize: 12, lineHeight: 18 },
});
