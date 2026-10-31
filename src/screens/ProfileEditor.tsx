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
      <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, styles.secondaryButton]}><AppText style={styles.secondaryText}>Cancel</AppText></Pressable>
        <AppText accessibilityRole="header" style={styles.title}>{preferencesOnly ? 'Preferences' : 'About you'}</AppText>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.button, styles.primaryButton, saving && { opacity: 0.55 }]}><AppText style={styles.primaryText}>{saving ? 'Saving…' : 'Save'}</AppText></Pressable></View>
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
  screen: { flex: 1, backgroundColor: '#000000' },
  toolbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  button: { minHeight: 44, minWidth: 80, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  secondaryButton: { borderWidth: 1, borderColor: '#2468f5', backgroundColor: 'transparent' },
  primaryButton: { backgroundColor: '#2468f5' },
  secondaryText: { color: '#2468f5', fontFamily: fonts.medium, fontSize: 14 },
  primaryText: { color: '#ffffff', fontFamily: fonts.semibold, fontSize: 14 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 21, letterSpacing: -0.15, color: '#ffffff' },
  form: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 10 },
  label: { color: '#cccccc', fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginTop: 16 },
  input: { backgroundColor: '#272729', color: '#ffffff', fontFamily: fonts.regular, fontSize: 16, padding: 14, borderRadius: 11, minHeight: 48 },
  multiline: { minHeight: 140, lineHeight: 24 },
  error: { color: '#ff9eaa', lineHeight: 22 },
});
