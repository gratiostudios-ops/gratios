import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { agentStickers } from '../agent-icons';
import { marketplaceArtworkOptions, type MarketplaceArtworkKey } from '../data/marketplace';
import { carouselTheme } from '../data/carousel-theme';
import { carouselArt } from '../carousel-art';
import { imageSource } from '../assets';
import type { ImageReference } from '../data/types';
import { AppText } from './UI';
import { colors, fonts } from '../theme';

export function MarketArt({ image, size = 64 }: { image?: ImageReference; size?: number }) {
  const option = marketplaceArtworkOptions.find(item => item.asset === image?.asset);
  return <Image source={option ? agentStickers[option.sticker].source : imageSource(image, 'brief')} resizeMode="contain" style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}
export function MarketButton({ label, onPress, disabled, secondary, busy }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, (disabled || busy) && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}>
    {busy ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={[ui.buttonText, secondary && { color: '#b5c9ff' }]}>{label}</AppText>}
  </Pressable>;
}
export function MarketError({ text }: { text?: string }) { return text ? <AppText accessibilityLiveRegion="polite" style={ui.error}>{text}</AppText> : null; }
export function MarketField({ label, value, onChange, multiline = false, maxLength = 16000 }: { label: string; value: string; onChange(value: string): void; multiline?: boolean; maxLength?: number }) {
  return <View style={{ gap: 8 }}><AppText style={ui.label}>{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} maxLength={maxLength} placeholderTextColor="#666" selectionColor="#2468f5" textAlignVertical={multiline ? 'top' : 'center'} style={[ui.input, multiline && { minHeight: 115 }]} /></View>;
}
export function MarketModal({ title, onClose, children, busy = false, popup = false, compact = false }: { title: string; onClose(): void; children: React.ReactNode; busy?: boolean; popup?: boolean; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  if (popup) return <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[ui.popupOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss agent details" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={ui.popupCard}>
        <View style={ui.popupToolbar}>
          <AppText accessibilityRole="header" style={ui.modalTitle}>{title}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close agent details" disabled={busy} onPress={onClose} style={ui.popupClose}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6L18 18M18 6L6 18" stroke="#fff" strokeWidth={2} strokeLinecap="round" /></Svg>
          </Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.popupContent}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
  return <Modal animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[ui.modal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={ui.toolbar}><AppText accessibilityRole="header" style={ui.modalTitle}>{title}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={onClose} style={ui.close}><AppText style={ui.link}>Close</AppText></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.modalContent, compact && { padding: 20, paddingBottom: 32, gap: 12 }]}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
export function MarketDisclosure({ title, summary, children, defaultOpen = false }: { title: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <View style={ui.disclosure}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={ui.disclosureHeader}>
      <View style={{ flex: 1, gap: 3 }}><AppText style={ui.disclosureTitle}>{title}</AppText>{!open && !!summary && <AppText numberOfLines={1} style={ui.disclosureSummary}>{summary}</AppText>}</View>
      <AppText style={ui.disclosureChevron}>{open ? '⌃' : '⌄'}</AppText>
    </Pressable>
    {open && <View style={ui.disclosureContent}>{children}</View>}
  </View>;
}
export function Consent({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={ui.consent}><View style={[ui.checkbox, checked && { backgroundColor: '#2468f5', borderColor: '#2468f5' }]}><AppText style={{ fontSize: 13 }}>{checked ? '✓' : ''}</AppText></View><AppText style={[ui.body, { flex: 1 }]}>{label}</AppText></Pressable>;
}
/** Selection belongs exclusively to the publishing flow; viewers see saved artwork. */
export function PublishingArtworkPicker({ selected, onSelect }: { selected?: string; onSelect(key: MarketplaceArtworkKey): void }) {
  return <View style={{ gap: 12 }}><AppText style={ui.label}>Choose your listing artwork</AppText><AppText style={ui.body}>This choice appears on your listing and featured card.</AppText><View style={ui.stickers}>{marketplaceArtworkOptions.map(option => {
    const theme = carouselTheme({ artwork: { asset: option.asset } });
    return <Pressable key={option.asset} accessibilityRole="button" accessibilityLabel={option.label + ' artwork'} accessibilityState={{ selected: option.asset === selected }} onPress={() => onSelect(option.asset)} style={[ui.artworkChoice, option.asset === selected && { borderColor: '#2468f5', backgroundColor: '#172644' }]}>
      {theme ? <Image source={carouselArt[theme]} style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }} resizeMode="cover" /> : <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#54341e' }}><Image source={agentStickers[option.sticker].source} style={{ width: '85%', height: '85%' }} resizeMode="contain" /></View>}
      <AppText style={{ color: option.asset === selected ? '#91b4ff' : '#aaa', fontSize: 12, paddingVertical: 6 }}>{option.label}{option.asset === selected ? ' ✓' : ''}</AppText>
    </Pressable>;
  })}</View></View>;
}
export const ui = StyleSheet.create({
  disclosure: { backgroundColor: '#1b1b1b', borderRadius: 16, overflow: 'hidden' },
  disclosureHeader: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  disclosureTitle: { fontFamily: fonts.semibold, fontSize: 14, color: '#dedede' },
  disclosureSummary: { fontSize: 12, lineHeight: 16, color: '#858585' },
  disclosureChevron: { color: '#929292', fontSize: 20 },
  disclosureContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  popupOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  popupCard: { width: '100%', maxWidth: 420, maxHeight: '85%', backgroundColor: '#1b1b1b', borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff14' },
  popupToolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 24, paddingRight: 16, paddingTop: 16, paddingBottom: 12 },
  popupClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333333', alignItems: 'center', justifyContent: 'center' },
  popupBody: { color: '#A6A6A6', fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  popupContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, gap: 20 },
  modal: { flex: 1, backgroundColor: '#0d0d0d' }, toolbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: '#222' }, modalTitle: { fontFamily: fonts.bold, fontSize: 20, flex: 1 }, close: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' }, link: { color: '#558dff', fontSize: 14 }, modalContent: { padding: 24, paddingBottom: 48, gap: 20 },
  button: { minHeight: 44, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2468f5' }, secondary: { backgroundColor: '#1a2234' }, buttonText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14 }, body: { color: '#a5a5a5', fontSize: 14, lineHeight: 21 }, label: { color: '#ccc', fontSize: 13, fontFamily: fonts.semibold }, input: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: '#303030', color: '#fff', fontSize: 15, lineHeight: 22 }, error: { color: '#ffb8aa', fontSize: 13, lineHeight: 19 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 6, minHeight: 44 }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: '#555', alignItems: 'center', justifyContent: 'center' }, stickers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, artworkChoice: { width: '30%', borderRadius: 14, borderWidth: 2, borderColor: '#292929', backgroundColor: '#191919', padding: 4, alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 10 }, heading: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, lineHeight: 25 }, section: { color: '#558dff', fontFamily: fonts.semibold, fontSize: 15, marginTop: 8 },
});
