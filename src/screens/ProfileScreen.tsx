import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { SafeImage } from '../components/SafeImage';
import { AppText } from '../components/UI';
import type { MenuActions } from '../components/Navigation';
import { ConnectorSettings } from '../components/ConnectorSettings';
import { AgentManager } from '../components/AgentManager';
import type { Agent } from '../data/types';
import { AgentChat } from './AgentChat';
import { colors, fonts } from '../theme';
import { MarkdownEditor } from './MarkdownEditor';
import { useAuth } from '../auth/Auth';
import { ProfileEditor } from './ProfileEditor';

export function ProfileScreen(_menuActions: MenuActions) {
  const { profile } = useAppData();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [aboutExpanded, setAboutExpanded] = useState(false);
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
  const [editor, setEditor] = useState<{ id: string; title: string } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 88 + insets.bottom }]}>
      <View style={[styles.hero, { paddingTop: Math.max(84, insets.top + 30) + 25 }]}>
        <SafeImage image={profile.avatar} fallback="avatar" style={styles.avatar} resizeMode="cover" accessibilityLabel={`${profile.name}'s avatar`} />
        <View style={styles.identity}><AppText style={styles.name}>{profile.name}</AppText><AppText style={styles.email}>{profile.email}</AppText></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit your profile" hitSlop={8} onPress={() => setProfileEditor('about')}><AppText style={styles.editLink}>Edit</AppText></Pressable>
      </View>
      <View style={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel="About you" accessibilityState={{ expanded: aboutExpanded }} onPress={() => setAboutExpanded(value => !value)} style={styles.aboutHeading}>
          <AppText style={styles.label}>About you</AppText><AppText style={styles.plus}>{aboutExpanded ? '−' : '+'}</AppText>
        </Pressable>
        {aboutExpanded && <View style={styles.aboutContent}>
          <View style={styles.preferencesHeading}><AppText style={styles.preferenceText}>DOB: {profile.dob || '—'}</AppText><Pressable accessibilityRole="button" onPress={() => setProfileEditor('about')}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
          <View style={styles.interests}>{profile.interests.map(interest => <View key={interest} style={styles.interest}><AppText style={styles.interestText}>{interest}</AppText></View>)}</View>
        </View>}
        <View style={styles.preferencesHeading}><AppText style={styles.label}>Preferences</AppText>
          <Pressable accessibilityRole="button" onPress={() => setProfileEditor('preferences')} hitSlop={8}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
        <View style={styles.preferenceList}>{(allPreferences ? profile.preferences : profile.preferences.slice(0, 2)).map((preference, index) => <View key={index} style={styles.preferenceRow}><AppText style={[styles.preferenceText, styles.preferenceContent]}>{preference}</AppText></View>)}</View>
        {profile.preferences.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allPreferences }} onPress={() => setAllPreferences(value => !value)} hitSlop={8} style={styles.preferencesMore}><AppText style={styles.link}>{allPreferences ? 'show less −' : 'show all +'}</AppText></Pressable>}
        <AgentManager onEdit={setSelectedAgent} />
        <AppText style={[styles.label, styles.connectorsLabel]}>Connectors</AppText>
        <ConnectorSettings />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: loggingOut, busy: loggingOut }} disabled={loggingOut} onPress={() => { void logout(); }} style={({ pressed }) => [styles.logoutButton, (pressed || loggingOut) && { opacity: 0.65 }]}><AppText style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</AppText></Pressable>
        {!!logoutError && <AppText accessibilityLiveRegion="polite" style={{ color: '#ffb8aa', fontSize: 13 }}>{logoutError}</AppText>}
      </View>
    </ScrollView>
    {selectedAgent && <Modal transparent animationType="fade" onRequestClose={() => setSelectedAgent(null)}><View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000a', padding: 24 }}><View style={{ backgroundColor: '#202020', borderRadius: 22, padding: 24, gap: 16 }}><AppText style={styles.detailTitle}>{selectedAgent.name}</AppText><Pressable accessibilityRole="button" onPress={() => { setEditor({ id: selectedAgent.id + ':PREFERENCE', title: selectedAgent.name + ' preferences' }); setSelectedAgent(null); }}><AppText style={styles.editLink}>Edit private preferences</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => { setEditor({ id: selectedAgent.id + ':AGENT', title: selectedAgent.name + ' purpose' }); setSelectedAgent(null); }}><AppText style={styles.editLink}>Edit purpose</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => { setChatAgent(selectedAgent); setSelectedAgent(null); }}><AppText style={styles.editLink}>Chat</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => setSelectedAgent(null)}><AppText style={styles.editLink}>Close</AppText></Pressable></View></View></Modal>}
    {chatAgent && <AgentChat agent={chatAgent} onClose={() => setChatAgent(null)} />}
    {profileEditor && <ProfileEditor preferencesOnly={profileEditor === 'preferences'} onClose={() => setProfileEditor(null)} />}
    {editor && <MarkdownEditor key={editor.id} documentId={editor.id} title={editor.title} onClose={() => setEditor(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  logoutButton: { alignSelf: 'stretch', minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 34, borderRadius: 16, backgroundColor: '#2B2B2B' },
  logoutText: { color: '#EF5350', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56 },
  detailTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 18 },
  detailButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60 },
  hero: { flexDirection: 'row', alignItems: 'center', paddingLeft: 25, paddingRight: 27, gap: 17, paddingBottom: 8 },
  avatar: { width: 69, height: 69, backgroundColor: '#62a2ce', borderRadius: 35, borderWidth: 2, borderColor: '#ffffff' },
  identity: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: '#ffffff' },
  email: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, color: '#afafaf' },
  body: { paddingLeft: 25, paddingRight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, color: '#bcbcbc' },
  aboutHeading: { minHeight: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: 10, paddingRight: 20 },
  plus: { color: '#777777', fontSize: 22 },
  aboutContent: { paddingVertical: 12 },
  groupLabel: { color: '#858585', fontSize: 14, fontFamily: fonts.semibold, marginBottom: 9, marginTop: 10 },
  emptyPublic: { color: '#777777', fontSize: 12, paddingVertical: 8 },
  connectorsLabel: { marginTop: 34, marginBottom: 8 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  interest: { backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 25, borderRadius: 30, minHeight: 27 },
  interestText: { fontSize: 12, lineHeight: 15, letterSpacing: 0.12, color: '#dedede', textAlign: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, letterSpacing: 0.12, color: '#2468f5' },
  preferencesHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editLink: { color: '#2468f5', fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', letterSpacing: 0.14, paddingRight: 10 },
  preferenceList: { marginTop: 3, paddingHorizontal: 12, backgroundColor: '#151515', borderRadius: 12, overflow: 'hidden' },
  preferenceRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  preferenceContent: { color: '#6D6D6D', lineHeight: 22 },
  preferenceText: { color: '#d2d2d2', fontSize: 14, lineHeight: 17, letterSpacing: 0.14 },
  preferencesMore: { marginTop: 12, marginLeft: 14, alignSelf: 'flex-start' },
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
