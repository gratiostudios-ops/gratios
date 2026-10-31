import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { SafeImage } from '../components/SafeImage';
import { AppText } from '../components/UI';
import type { MenuActions } from '../components/Navigation';
import { ConnectorSettings } from '../components/ConnectorSettings';
import { AgentManager } from '../components/AgentManager';
import { colors, fonts } from '../theme';
import { MarkdownEditor } from './MarkdownEditor';
import { useAuth } from '../auth/Auth';
import { ProfileEditor } from './ProfileEditor';
import { PhosphorIcon } from '../components/PhosphorIcon';

export function ProfileScreen({ onContact }: MenuActions & { onContact(): void }) {
  const { profile } = useAppData();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [preferencesExpanded, setPreferencesExpanded] = useState(false);
  const [allPreferences, setAllPreferences] = useState(false);
  const [profileEditor, setProfileEditor] = useState<'about' | 'preferences' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try { await auth.logout(); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : 'Could not log out. Please try again.'); }
    finally { setLoggingOut(false); }
  };
  const [editor, setEditor] = useState<{ id: string; title: string; readOnly: boolean } | null>(null);

  return <View style={styles.screen}>
    <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}>
      <View style={{ height: insets.top + 20 }} />
      <View style={styles.hero}>
        <SafeImage image={profile.avatar} fallback="avatar" style={styles.avatar} resizeMode="cover" accessibilityLabel={`${profile.name}'s avatar`} />
        <View style={styles.identity}><AppText numberOfLines={2} style={styles.name}>{profile.name}</AppText><AppText numberOfLines={2} style={styles.email}>{profile.email}</AppText></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit your profile" hitSlop={8} onPress={() => setProfileEditor('about')} style={styles.editButton}><AppText style={styles.editButtonText}>Edit</AppText></Pressable>
      </View>
      <View style={styles.body}>
        <View style={[styles.profileTile, styles.secondTile]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Preferences" accessibilityState={{ expanded: preferencesExpanded }} onPress={() => setPreferencesExpanded(value => !value)} style={styles.aboutHeading}>
            <AppText style={styles.label}>Preferences</AppText><View style={{ transform: [{ rotate: preferencesExpanded ? '180deg' : '0deg' }] }}><PhosphorIcon name="caret-down" size={18} color="#a1a1a6" /></View>
          </Pressable>
          {preferencesExpanded && <View style={[styles.aboutContent, styles.expandedPreferences]}>
            <View style={[styles.preferencesHeading, { justifyContent: 'flex-end' }]}><Pressable accessibilityRole="button" onPress={() => setProfileEditor('preferences')} hitSlop={8}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
            <View style={styles.preferencesPanel}>
              <View style={styles.preferenceList}>{(allPreferences ? profile.preferences : profile.preferences.slice(0, 2)).map((preference, index) => <View key={index} style={styles.preferenceRow}><AppText style={[styles.preferenceText, styles.preferenceContent]}>{preference}</AppText></View>)}</View>
              {profile.preferences.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allPreferences }} onPress={() => setAllPreferences(value => !value)} hitSlop={8} style={styles.preferencesMore}><AppText style={styles.link}>{allPreferences ? 'Show less' : 'Show all'}</AppText></Pressable>}
            </View>
          </View>}
        </View>
        <AgentManager onEdit={(agent, readOnly = false) => setEditor({ id: agent.id + ':AGENT', title: agent.name, readOnly })} />
        <AppText style={[styles.label, styles.connectorsLabel]}>Connectors</AppText>
        <View style={styles.connectorTile}><ConnectorSettings /></View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: loggingOut, busy: loggingOut }} disabled={loggingOut} onPress={() => { void logout(); }} style={({ pressed }) => [styles.logoutButton, (pressed || loggingOut) && { opacity: 0.65 }]}><AppText style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</AppText></Pressable>
        {!!logoutError && <AppText accessibilityLiveRegion="polite" style={{ color: '#ffb8aa', fontSize: 13 }}>{logoutError}</AppText>}
      </View>
    </ScrollView>
    {profileEditor && <ProfileEditor preferencesOnly={profileEditor === 'preferences'} onClose={() => setProfileEditor(null)} />}
    {editor && <MarkdownEditor key={editor.id} documentId={editor.id} title={editor.title} readOnly={editor.readOnly} onClose={() => setEditor(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  logoutButton: { alignSelf: 'stretch', minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 28, borderRadius: 999, backgroundColor: '#1b1b1d', borderWidth: StyleSheet.hairlineWidth, borderColor: '#303034' },
  logoutText: { color: '#ff453a', fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56 },
  detailTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 18 },
  detailButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  screen: { flex: 1, backgroundColor: colors.background },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 152 },
  scrollContent: { paddingBottom: 40, gap: 18 },
  hero: { marginHorizontal: 22, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#111113', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: '#29292d' },
  avatar: { width: 60, height: 60, flexShrink: 0, backgroundColor: '#29292d', borderRadius: 30 },
  identity: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', minWidth: 0, gap: 8 },
  name: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: '#ffffff' },
  email: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: '#a6a6a6' },
  editButton: { minHeight: 44, minWidth: 36, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  editButtonText: { color: '#2468f5', textDecorationLine: 'underline', fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19 },
  body: { paddingHorizontal: 22, gap: 14 },
  profileTile: { backgroundColor: 'transparent', borderRadius: 0, paddingHorizontal: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#303034' },
  secondTile: { backgroundColor: 'transparent' },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: '#ffffff', letterSpacing: -0.1 },
  aboutHeading: { minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutContent: { paddingTop: 6, paddingBottom: 16, gap: 10 },
  expandedPreferences: { marginHorizontal: -12, marginBottom: 14 },
  preferencesPanel: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, borderRadius: 14, backgroundColor: '#111113' },
  groupLabel: { color: '#858585', fontSize: 14, fontFamily: fonts.semibold, marginBottom: 9, marginTop: 10 },
  emptyPublic: { color: '#777777', fontSize: 12, paddingVertical: 8 },
  connectorsLabel: { marginTop: 14, marginBottom: 2, fontSize: 18, lineHeight: 24, color: '#ffffff', letterSpacing: -0.15 },
  connectorTile: { paddingHorizontal: 0, paddingVertical: 0 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  interest: { backgroundColor: '#29292d', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderColor: '#3b3b40' },
  interestText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: '#ffffff', textAlign: 'center' },
  link: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: '#2468f5' },
  preferencesHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editLink: { color: '#2468f5', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, paddingRight: 6 },
  preferenceList: { paddingHorizontal: 0, backgroundColor: 'transparent', overflow: 'hidden' },
  preferenceRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#303034' },
  preferenceContent: { color: '#cccccc', lineHeight: 22 },
  preferenceText: { color: '#ffffff', fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  preferencesMore: { marginTop: 2, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  agentsLabel: { marginTop: 26, marginBottom: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 13, columnGap: 11, paddingLeft: 1.3, paddingRight: 3.7 },
  agentCard: { height: 210, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', paddingTop: 18, paddingHorizontal: 12 },
  agentArt: { height: 70, justifyContent: 'flex-end', alignItems: 'center' },
  agentNameArea: { minHeight: 38, justifyContent: 'center', width: '100%' },
  agentName: { fontFamily: fonts.bold, color: '#ffffff', fontSize: 16, lineHeight: 19, textAlign: 'center', letterSpacing: 0.16 },
  agentDescription: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 14, textAlign: 'center', color: '#6d6d6d', letterSpacing: 0.12, height: 33, width: 112 },
  agentEdit: { marginTop: 5, height: 27, borderRadius: 30, width: 121, backgroundColor: '#2468f5', alignItems: 'center', justifyContent: 'center' },
  agentEditText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, letterSpacing: 0.14, color: '#ffffff' },
});
