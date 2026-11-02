import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppData } from '../data/AppData';
import { FixedContact } from '../components/ContactLink';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';

export function MarkdownEditor({ documentId, title, onClose, readOnly = false }: { documentId: string; title: string; onClose: () => void; readOnly?: boolean }) {
  const { documents, saveDocument } = useAppData();
  const [value, setValue] = useState(documents[documentId] ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (saving || readOnly) return;
    setSaving(true); setError(null);
    try { await saveDocument(documentId, value); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { setSaving(false); }
  };
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { marginTop: insets.top + 24, marginBottom: insets.bottom + 24 }]}>
      <StatusBar hidden={false} style="light" />
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><AppText style={styles.cancel}>{readOnly ? 'Close' : 'Cancel'}</AppText></Pressable>
        <AppText numberOfLines={1} accessibilityRole="header" style={styles.title}>{title}</AppText>
        {!readOnly && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.button, styles.save]}><AppText style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</AppText></Pressable>}
      </View>
      <AppText style={styles.filename}>{documentId.split(':').pop()?.toUpperCase()}.md</AppText>
      <TextInput accessibilityLabel={`${title} Markdown`} multiline editable={!readOnly} autoCorrect={false} autoCapitalize="none" spellCheck={false} textAlignVertical="top" value={value} onChangeText={setValue}
        style={styles.editor} selectionColor={colors.blue} placeholder="# Your instructions" placeholderTextColor={colors.faint} />
      <AppText accessibilityLiveRegion="polite" style={styles.hint}>{error ?? (readOnly ? 'Marketplace instructions · Read-only' : 'Markdown · Save to update your instructions')}</AppText>
    </KeyboardAvoidingView>
    </View>
    <FixedContact />
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#00000099' },
  toolbar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  button: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  cancel: { color: colors.blue },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, flex: 1, textAlign: 'center' },
  save: { backgroundColor: colors.blue, borderRadius: 22, minHeight: 34, paddingHorizontal: 18 },
  saveText: { fontFamily: fonts.semibold, color: colors.onBlue },
  filename: { color: colors.muted, paddingHorizontal: 26, paddingVertical: 14, fontSize: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  editor: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : fonts.mono, color: colors.body, fontSize: 14, lineHeight: 23, padding: 26 },
  hint: { paddingHorizontal: 26, paddingVertical: 16, color: colors.muted, fontSize: 12 },
});
