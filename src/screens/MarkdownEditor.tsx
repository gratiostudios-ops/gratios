import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppData } from '../data/AppData';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';

export function MarkdownEditor({ documentId, title, onClose }: { documentId: string; title: string; onClose: () => void }) {
  const { documents, saveDocument } = useAppData();
  const [value, setValue] = useState(documents[documentId] ?? '');
  const insets = useSafeAreaInsets();
  return <Modal animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { paddingTop: Math.max(20, insets.top), paddingBottom: insets.bottom }]}>
      <StatusBar hidden={false} style="light" />
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><AppText style={styles.cancel}>Cancel</AppText></Pressable>
        <AppText numberOfLines={1} accessibilityRole="header" style={styles.title}>{title}</AppText>
        <Pressable accessibilityRole="button" onPress={() => { saveDocument(documentId, value); onClose(); }} style={[styles.button, styles.save]}><AppText style={styles.saveText}>Save</AppText></Pressable>
      </View>
      <AppText style={styles.filename}>{documentId}.md</AppText>
      <TextInput accessibilityLabel={`${title} Markdown`} multiline autoCorrect={false} autoCapitalize="none" spellCheck={false} textAlignVertical="top" value={value} onChangeText={setValue}
        style={styles.editor} selectionColor={colors.blue} placeholder="# Your instructions" placeholderTextColor={colors.faint} />
      <AppText style={styles.hint}>Markdown · Saved for this session</AppText>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
