import { HapticPressable as Pressable } from './HapticControls';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { agentStickers } from '../agent-icons';
import { marketplaceArtworkOptions, type MarketplaceArtworkKey } from '../data/marketplace';
import { FixedContact } from './ContactLink';
import { PhosphorIcon } from './PhosphorIcon';
import { imageSource } from '../assets';
import type { ImageReference } from '../data/types';
import { AppText } from './UI';
import { colors, fonts } from '../theme';

export function MarketArt({ image, size = 64 }: { image?: ImageReference; size?: number }) {
  const option = !image?.uri ? marketplaceArtworkOptions.find(item => item.asset === image?.asset) : undefined;
  return <Image source={option ? agentStickers[option.sticker].source : imageSource(image, 'brief')} resizeMode="contain" style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}
export function MarketButton({ label, onPress, disabled, secondary: _secondary, busy }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.button, (disabled || busy) && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}>
    {busy ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={ui.buttonText}>{label}</AppText>}
  </Pressable>;
}
export function MarketRows({ items }: { items: string[] }) {
  return <View style={ui.capabilityList}>{items.map((item, index) => <View key={item} style={[ui.capabilityRow, index === items.length - 1 && { borderBottomWidth: 0 }]}><AppText style={ui.popupBody}>{item}</AppText></View>)}</View>;
}
export function MarketError({ text }: { text?: string }) { return text ? <AppText accessibilityLiveRegion="polite" style={ui.error}>{text}</AppText> : null; }
export function MarketField({ label, value, onChange, multiline = false, maxLength = 16000 }: { label: string; value: string; onChange(value: string): void; multiline?: boolean; maxLength?: number }) {
  return <View style={{ gap: 8 }}><AppText style={ui.label}>{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} maxLength={maxLength} placeholderTextColor="#666" selectionColor="#2468f5" textAlignVertical={multiline ? 'top' : 'center'} style={[ui.input, multiline && { minHeight: 104 }]} /></View>;
}
export function MarketModal({ title, onClose, children, busy = false, popup = false, compact = false, fitContent = false }: { title: string; onClose(): void; children: React.ReactNode; busy?: boolean; popup?: boolean; compact?: boolean; fitContent?: boolean }) {
  const insets = useSafeAreaInsets();
  if (popup) return <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[ui.popupOverlay, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss agent details" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={ui.popupCard}>
        <View style={ui.popupToolbar}>
          <AppText accessibilityRole="header" style={ui.modalTitle}>{title}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close agent details" disabled={busy} onPress={onClose} style={ui.popupClose}>
            <PhosphorIcon name="close" size={18} color="#fff" />
          </Pressable>
        </View>
        <ScrollView style={ui.popupScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.popupContent}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
    <FixedContact />
  </Modal>;
  if (fitContent) return <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[ui.popupOverlay, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss agent" disabled={busy} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={ui.popupCard}>
        <View style={ui.popupToolbar}><AppText accessibilityRole="header" style={ui.modalTitle}>{title}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Close agent" disabled={busy} onPress={onClose} style={ui.popupClose}><PhosphorIcon name="close" size={18} color="#fff" /></Pressable></View>
        <ScrollView style={ui.popupScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.popupContent}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
    <FixedContact />
  </Modal>;
  return <Modal animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[ui.modal, { paddingTop: insets.top + 48, paddingBottom: insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={ui.toolbar}><AppText accessibilityRole="header" style={ui.modalTitle}>{title}</AppText><Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={onClose} style={ui.popupClose}><PhosphorIcon name="close" size={18} color="#dedede" /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.modalContent, compact && { padding: 20, paddingBottom: 32, gap: 12 }]}>{children}</ScrollView>
    </KeyboardAvoidingView>
    <FixedContact />
  </Modal>;
}
export function MarketDisclosure({ title, summary, children, defaultOpen = false }: { title: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <View style={ui.disclosure}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={ui.disclosureHeader}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}><AppText style={ui.disclosureTitle}>{title}</AppText>{!open && !!summary && <AppText numberOfLines={1} style={ui.disclosureSummary}>{summary}</AppText>}</View>
      <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><PhosphorIcon name="caret-down" size={18} /></View>
    </Pressable>
    {open && <View style={ui.disclosureContent}>{children}</View>}
  </View>;
}
export function Consent({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={ui.consent}><View style={[ui.checkbox, checked && { backgroundColor: '#2468f5', borderColor: '#2468f5' }]}>{checked && <PhosphorIcon name="check" size={14} color="#fff" />}</View><AppText style={[ui.body, { flex: 1 }]}>{label}</AppText></Pressable>;
}
/** Selection belongs exclusively to the publishing flow; viewers see saved artwork. */
export function PublishingArtworkPicker({ selected, onSelect }: { selected?: string; onSelect(key: MarketplaceArtworkKey): void }) {
  return <View style={{ gap: 8 }}>
    <AppText style={ui.disclosureSummary}>Choose an icon for your agent.</AppText>
    <View accessibilityRole="radiogroup" style={ui.artworkGrid}>
      {marketplaceArtworkOptions.map(option => {
        const chosen = selected === option.asset;
        return <View key={option.asset} style={ui.artworkCell}>
          <Pressable accessibilityRole="radio" accessibilityLabel={option.label + ' icon'} accessibilityState={{ checked: chosen }} onPress={() => onSelect(option.asset)} style={({ pressed }) => [ui.artworkOption, pressed && { opacity: 0.8 }]}>
            <View style={[ui.artworkChoice, chosen && ui.artworkSelected]}>
              <Image source={agentStickers[option.sticker].source} style={ui.artworkPreview} resizeMode="contain" />
              {chosen && <View style={ui.artworkCheck}><PhosphorIcon name="check" size={12} color="#fff" /></View>}
            </View>
            <AppText numberOfLines={2} style={[ui.artworkLabel, chosen && { color: '#91b4ff' }]}>{option.label}</AppText>
          </Pressable>
        </View>;
      })}
    </View>
  </View>;
}

export const ui = StyleSheet.create({
  capabilityList: { borderRadius: 14, backgroundColor: '#242424', overflow: 'hidden' },
  capabilityRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ffffff20' },
  disclosure: { backgroundColor: '#1b1b1b', borderRadius: 16, overflow: 'hidden' },
  disclosureHeader: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  disclosureTitle: { fontFamily: fonts.semibold, fontSize: 14, color: '#dedede' },
  disclosureSummary: { fontSize: 12, lineHeight: 16, color: '#858585' },
  disclosureContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  popupOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  popupCard: { width: '100%', maxWidth: 420, maxHeight: '85%', flexShrink: 1, backgroundColor: '#1b1b1b', borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff14' },
  popupScroll: { flexGrow: 0, flexShrink: 1 },
  popupToolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  popupClose: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: '#333333', alignItems: 'center', justifyContent: 'center' },
  popupBody: { color: '#A6A6A6', fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  popupContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
  modal: { flex: 1, backgroundColor: '#0d0d0d' }, toolbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: '#222' }, modalTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 27, flex: 1, minWidth: 0 }, close: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' }, link: { color: '#558dff', fontSize: 14 }, modalContent: { padding: 24, paddingBottom: 48, gap: 20 },
  button: { minHeight: 44, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2468f5' }, buttonText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, textAlign: 'center', flexShrink: 1 }, body: { color: '#a5a5a5', fontSize: 14, lineHeight: 21 }, label: { color: '#ccc', fontSize: 13, fontFamily: fonts.semibold }, input: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: '#303030', color: '#fff', fontSize: 15, lineHeight: 22 }, error: { color: '#ffb8aa', fontSize: 13, lineHeight: 19 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6, minHeight: 44 }, checkbox: { width: 23, height: 23, flexShrink: 0, marginTop: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: '#555' }, artworkGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  artworkCell: { width: '33.333333%', padding: 4 },
  artworkOption: { gap: 6, alignItems: 'center' },
  artworkChoice: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: '#303030', backgroundColor: '#222222', overflow: 'hidden' },
  artworkSelected: { borderColor: '#2468f5', backgroundColor: '#172644' },
  artworkPreview: { width: '76%', height: '76%' },
  artworkLabel: { minHeight: 32, textAlignVertical: 'center', textAlign: 'center', color: '#a6a6a6', fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  artworkCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2468f5', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 10 }, heading: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, lineHeight: 25 }, section: { color: '#558dff', fontFamily: fonts.semibold, fontSize: 15, marginTop: 8 },
});
