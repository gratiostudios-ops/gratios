import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gateway } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { FixedContact } from '../components/ContactLink';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';

export function ProfileEditor({ preferencesOnly = false, onClose }: { preferencesOnly?: boolean; onClose(): void }) {
  const { profile, refresh, isDemo } = useAppData();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile.name);
  const [dob, setDob] = useState(profile.dob);
  const [interests, setInterests] = useState(profile.interests.join('\n'));
  const [preferences, setPreferences] = useState(profile.preferences.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lines = (text: string) => text.split('\n').map(value => value.trim()).filter(Boolean);
  const save = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      if (isDemo) throw new Error('Sign in to save your profile.');
      const fields = preferencesOnly ? { preferences: lines(preferences) } : { name: name.trim(), dob: dob.trim(), interests: lines(interests), preferences: lines(preferences) };
      await gateway.request('/gateway/profile', { method: 'PUT', body: JSON.stringify(fields) });
      await refresh(); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save your profile.'); }
    finally { setSaving(false); }
  };
  return <Modal animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom }]}>
      <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><AppText style={styles.link}>Cancel</AppText></Pressable>
        <AppText accessibilityRole="header" style={styles.title}>{preferencesOnly ? 'Preferences' : 'About you'}</AppText>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={styles.button}><AppText style={styles.link}>{saving ? 'Saving…' : 'Save'}</AppText></Pressable></View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {!preferencesOnly && <>
          <AppText style={styles.label}>Name</AppText><TextInput accessibilityLabel="Name" style={styles.input} value={name} onChangeText={setName} />
          <AppText style={styles.label}>Date of birth</AppText><TextInput accessibilityLabel="Date of birth" placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={dob} onChangeText={setDob} />
          <AppText style={styles.label}>Interests · one per line</AppText><TextInput accessibilityLabel="Interests" multiline textAlignVertical="top" style={[styles.input, styles.multiline]} value={interests} onChangeText={setInterests} />
        </>}
        <AppText style={styles.label}>Preferences · one per line</AppText><TextInput accessibilityLabel="Preferences" multiline textAlignVertical="top" style={[styles.input, styles.multiline]} value={preferences} onChangeText={setPreferences} />
        {error && <AppText accessibilityLiveRegion="polite" style={styles.error}>{error}</AppText>}
      </ScrollView>
    </KeyboardAvoidingView>
    <FixedContact />
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, toolbar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, button: { minHeight: 44, padding: 12, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 18 }, link: { color: colors.blue }, form: { padding: 27, gap: 12 }, label: { color: colors.secondary, marginTop: 12 },
  input: { backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.regular, fontSize: 16, padding: 14, borderRadius: 12, minHeight: 48 }, multiline: { minHeight: 130, lineHeight: 24 }, error: { color: '#ff9eaa', lineHeight: 22 },
});
