import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { cardImage } from '../assets';
import { SafeImage } from '../components/SafeImage';
import { Icon } from '../components/Icons';
import type { Agent } from '../data/types';
import { Illustration } from '../components/Illustration';
import { AppText } from '../components/UI';
import { FloatingNavigation, type MenuActions } from '../components/Navigation';
import { colors, fonts } from '../theme';
import { MarkdownEditor } from './MarkdownEditor';
import { AccountSettings } from './AccountSettings';
import { AgentChat } from './AgentChat';
import { ProfileEditor } from './ProfileEditor';

export function ProfileScreen(menuActions: MenuActions) {
  const { profile, agents } = useAppData();
  const insets = useSafeAreaInsets();
  const [allInterests, setAllInterests] = useState(false);
  const [allPreferences, setAllPreferences] = useState(false);
  const [profileEditor, setProfileEditor] = useState<'about' | 'preferences' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editor, setEditor] = useState<{ id: string; title: string } | null>(null);
  const [chatAgent, setChatAgent] = useState<{ id: string; name: string } | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const heroOffset = Math.max(0, insets.top - 44);
  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 88 + insets.bottom }]}>
      <View style={[styles.hero, { height: 301 + heroOffset }]}>
        <LinearGradient colors={['#bbd0fa', '#1148bb']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.heroGradient, { height: 344 + heroOffset }]} />
        <SafeImage image={profile.avatar} fallback="avatar" style={[styles.avatar, { top: 89 + heroOffset }]} resizeMode="cover" accessibilityLabel={`${profile.name}'s avatar`} />
        <LinearGradient pointerEvents="none" colors={['#27272700', '#0606067b', '#0b0b0bde', colors.background]} locations={[0, 0.4375, 0.798077, 1]} style={[styles.heroFade, { top: 170 + heroOffset }]} />
        <AppText style={[styles.name, { top: 232 + heroOffset }]}>{profile.name}</AppText>
        <AppText style={[styles.email, { top: 256 + heroOffset }]}>{profile.email}</AppText>
      </View>

      <View style={styles.body}>
        <View style={styles.preferencesHeading}><AppText style={styles.label}>About you</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit your profile" onPress={() => setProfileEditor('about')} hitSlop={8}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
        <View style={styles.dob}><AppText style={styles.dobLabel}>DOB</AppText><AppText style={styles.dobValue}>{profile.dob ? (/^\d{4}-\d{2}-\d{2}$/.test(profile.dob) ? `${profile.dob.slice(5, 7)}/${profile.dob.slice(8, 10)}/${profile.dob.slice(0, 4)}` : profile.dob) : '—'}</AppText></View>
        <AppText style={styles.interestsLabel}>Interests</AppText>
        <View style={styles.interests}>{(allInterests ? profile.interests : profile.interests.slice(0, 3)).map((interest, index) => <View key={interest} style={[styles.interest, !allInterests && { flexBasis: 0, flexGrow: index === 1 ? 153.3 / 88.36 : 1, minWidth: 0, paddingHorizontal: 4 }]}><AppText numberOfLines={1} style={styles.interestText}>{interest}</AppText></View>)}</View>
        {profile.interests.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allInterests }} onPress={() => setAllInterests(previous => !previous)} hitSlop={8} style={styles.showAll}><AppText style={styles.link}>{allInterests ? 'show less −' : 'show all +'}</AppText></Pressable>}
        <View style={styles.sectionDivider} />

        <View style={styles.preferencesHeading}><AppText style={styles.label}>Preferences</AppText>
          <Pressable accessibilityRole="button" onPress={() => setProfileEditor('preferences')} hitSlop={8}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
        <View style={styles.preferenceList}>{(allPreferences ? profile.preferences : profile.preferences.slice(0, 2)).map((preference, index) => <View key={index} style={styles.preferenceRow}><AppText style={styles.preferenceText}>{preference}</AppText></View>)}</View>
        {profile.preferences.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allPreferences }} onPress={() => setAllPreferences(value => !value)} hitSlop={8} style={styles.preferencesMore}><AppText style={styles.link}>{allPreferences ? 'show less −' : 'show all +'}</AppText></Pressable>}
        <AppText style={[styles.label, styles.agentsLabel]}>Agents running</AppText>
        <View style={styles.grid} onLayout={event => { if (event.nativeEvent.layout.width > 0) setGridWidth(event.nativeEvent.layout.width - 5); }}>
          <LinearGradient pointerEvents="none" colors={['#0d0d0d', '#0b0b0bdb', '#0a0a0ac6', '#00000000']} locations={[0, 0.447115, 0.716346, 1]} style={styles.agentsFade} />
          {agents.length === 0 && <AppText style={styles.preferenceText}>No agents have been assigned yet.</AppText>}
          {agents.filter(agent => agent.enabled !== false).map(agent => <View key={agent.id} style={[styles.agentCard, { width: gridWidth ? (gridWidth - 11) / 2 : '48%' }]}>
            <View style={styles.agentArt}><Illustration image={cardImage(agent.image, agent.icon)} width={agent.icon === 'flight' ? 66 : agent.icon === 'gym' ? 126 : 101} height={agent.icon === 'flight' ? 63 : agent.icon === 'gym' ? 94 : 76} /></View>
            <View style={styles.agentNameArea}><AppText numberOfLines={2} style={styles.agentName}>{agent.name}</AppText></View>
            <AppText numberOfLines={2} style={styles.agentDescription}>{agent.description}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${agent.name}`} hitSlop={5} onPress={() => setSelectedAgent(agent)} style={({ pressed }) => [styles.agentEdit, pressed && { opacity: 0.7 }]}><AppText style={styles.agentEditText}>Edit</AppText></Pressable>
          </View>)}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setSettingsOpen(true)} style={styles.settingsEntry}><AppText style={styles.editLink}>Account settings</AppText></Pressable>
      </View>
    </ScrollView>
    <FloatingNavigation {...menuActions} />
    {settingsOpen && <Modal animationType="slide" onRequestClose={() => setSettingsOpen(false)}><View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}><View style={styles.detailHeader}><AppText style={styles.detailTitle}>Account settings</AppText><Pressable accessibilityRole="button" onPress={() => setSettingsOpen(false)} style={styles.detailButton}><AppText style={styles.editLink}>Close</AppText></Pressable></View><ScrollView contentContainerStyle={{ paddingHorizontal: 27, paddingBottom: Math.max(insets.bottom, 20) }}><AccountSettings /></ScrollView></View></Modal>}
    {selectedAgent && <Modal transparent animationType="fade" onRequestClose={() => setSelectedAgent(null)}><View style={styles.detailScrim}><View style={styles.detailCard}>
      <View style={styles.detailHeader}><Icon name={selectedAgent.icon} /><AppText style={styles.detailTitle}>{selectedAgent.name}</AppText><Pressable accessibilityRole="button" onPress={() => setSelectedAgent(null)} style={styles.detailButton}><AppText style={styles.editLink}>Close</AppText></Pressable></View>
      <AppText style={styles.preferenceText}>{selectedAgent.description}</AppText>
      <Pressable accessibilityRole="button" style={styles.detailButton} onPress={() => { setEditor({ id: selectedAgent.id + ':PREFERENCE', title: selectedAgent.name + ' preferences' }); setSelectedAgent(null); }}><AppText style={styles.editLink}>Edit preferences</AppText></Pressable>
      <Pressable accessibilityRole="button" style={styles.detailButton} onPress={() => { setEditor({ id: selectedAgent.id + ':AGENT', title: selectedAgent.name + ' purpose' }); setSelectedAgent(null); }}><AppText style={styles.editLink}>Edit purpose</AppText></Pressable>
      <Pressable accessibilityRole="button" style={styles.detailButton} onPress={() => { setChatAgent(selectedAgent); setSelectedAgent(null); }}><AppText style={styles.editLink}>Chat</AppText></Pressable>
    </View></View></Modal>}
    {profileEditor && <ProfileEditor preferencesOnly={profileEditor === 'preferences'} onClose={() => setProfileEditor(null)} />}
    {chatAgent && <AgentChat agent={chatAgent} onClose={() => setChatAgent(null)} />}
    {editor && <MarkdownEditor key={editor.id} documentId={editor.id} title={editor.title} onClose={() => setEditor(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  settingsEntry: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: 24 },
  detailScrim: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 24 },
  detailCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56 },
  detailTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 18 },
  detailButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60 },
  hero: { overflow: 'hidden', alignItems: 'center' },
  heroGradient: { position: 'absolute', top: -2, left: 0, right: 0 },
  avatar: { width: 161, height: 161, position: 'absolute', backgroundColor: '#272727', borderRadius: 80.5, borderWidth: 8, borderColor: '#ffffff' },
  heroFade: { position: 'absolute', left: 0, right: 0, height: 139 },
  name: { position: 'absolute', fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: 0.2, textAlign: 'center' },
  email: { position: 'absolute', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, color: '#afafaf', letterSpacing: 0.14, textAlign: 'center' },
  body: { paddingHorizontal: 27, paddingTop: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 14, color: '#939393', letterSpacing: 0.12 },
  dob: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dobLabel: { fontSize: 12, lineHeight: 17, color: '#646464', letterSpacing: 0.12 },
  dobValue: { fontSize: 14, lineHeight: 17, color: '#a6a6a6', letterSpacing: 0.14, paddingRight: 14 },
  interestsLabel: { fontSize: 14, lineHeight: 17, letterSpacing: 0.14, color: '#646464', marginTop: 16 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  interest: { backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 25, borderRadius: 30, minHeight: 27 },
  interestText: { fontSize: 12, lineHeight: 15, letterSpacing: 0.12, color: '#dedede', textAlign: 'center' },
  showAll: { marginTop: 6, alignSelf: 'flex-start' },
  link: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, letterSpacing: 0.12, color: colors.chip },
  sectionDivider: { height: 1, backgroundColor: colors.divider, marginTop: 16, marginBottom: 14 },
  preferencesHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editLink: { color: colors.blue, fontSize: 14, lineHeight: 17, textDecorationLine: 'underline', letterSpacing: 0.14, paddingRight: 10 },
  preferenceList: { marginTop: 11, paddingHorizontal: 14 },
  preferenceRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.divider },
  preferenceText: { color: '#d2d2d2', fontSize: 14, lineHeight: 17, letterSpacing: 0.14 },
  preferencesMore: { marginTop: 12, marginLeft: 14, alignSelf: 'flex-start' },
  agentsLabel: { marginTop: 23, marginBottom: 16 },
  agentsFade: { position: 'absolute', left: -40, right: -40, top: -13, height: 70 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 13, columnGap: 11, paddingLeft: 1.3, paddingRight: 3.7 },
  agentCard: { height: 210, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', paddingTop: 18, paddingHorizontal: 12 },
  agentArt: { height: 70, justifyContent: 'flex-end', alignItems: 'center' },
  agentNameArea: { height: 38, justifyContent: 'center', width: 118 },
  agentName: { fontFamily: fonts.bold, color: '#ffffff', fontSize: 16, lineHeight: 19, textAlign: 'center', letterSpacing: 0.16 },
  agentDescription: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 14, textAlign: 'center', color: '#6d6d6d', letterSpacing: 0.12, height: 33, width: 112 },
  agentEdit: { marginTop: 5, height: 27, borderRadius: 30, width: 115, backgroundColor: '#5189f9', alignItems: 'center', justifyContent: 'center' },
  agentEditText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, letterSpacing: 0.14, color: '#ffffff' },
});
