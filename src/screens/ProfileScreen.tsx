import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { cardImage } from '../assets';
import { SafeImage } from '../components/SafeImage';
import { Illustration } from '../components/Illustration';
import { AppText } from '../components/UI';
import type { MenuActions } from '../components/Navigation';
import { ConnectorSettings } from '../components/ConnectorSettings';
import { colors, fonts } from '../theme';
import { MarkdownEditor } from './MarkdownEditor';
import { AccountSettings } from './AccountSettings';
import { ProfileEditor } from './ProfileEditor';

export function ProfileScreen(_menuActions: MenuActions) {
  const { profile, agents } = useAppData();
  const insets = useSafeAreaInsets();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [allPreferences, setAllPreferences] = useState(false);
  const [profileEditor, setProfileEditor] = useState<'about' | 'preferences' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<{ id: string; title: string } | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 88 + insets.bottom }]}>
      <View style={[styles.hero, { paddingTop: Math.max(84, insets.top + 30) }]}>
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
        <View style={styles.preferenceList}>{(allPreferences ? profile.preferences : profile.preferences.slice(0, 2)).map((preference, index) => <View key={index} style={styles.preferenceRow}><AppText style={styles.preferenceText}>{preference}</AppText></View>)}</View>
        {profile.preferences.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allPreferences }} onPress={() => setAllPreferences(value => !value)} hitSlop={8} style={styles.preferencesMore}><AppText style={styles.link}>{allPreferences ? 'show less −' : 'show all +'}</AppText></Pressable>}
        <AppText style={[styles.label, styles.agentsLabel]}>Agent Manager</AppText>
        <AppText style={styles.groupLabel}>Public</AppText>
        <AppText style={styles.emptyPublic}>No public agents yet.</AppText>
        <AppText style={styles.groupLabel}>Private</AppText>
        <View style={styles.grid} onLayout={event => { if (event.nativeEvent.layout.width > 0) setGridWidth(event.nativeEvent.layout.width - 5); }}>
          {agents.length === 0 && <AppText style={styles.preferenceText}>No agents have been assigned yet.</AppText>}
          {agents.map(agent => <View key={agent.id} style={[styles.agentCard, { width: gridWidth ? (gridWidth - 11) / 2 : '48%' }]}>
            <View style={styles.agentArt}><Illustration image={cardImage(agent.image, agent.icon)} width={agent.icon === 'flight' ? 66 : agent.icon === 'gym' ? 126 : 101} height={agent.icon === 'flight' ? 63 : agent.icon === 'gym' ? 94 : 76} /></View>
            <View style={styles.agentNameArea}><AppText numberOfLines={2} style={styles.agentName}>{agent.name}</AppText></View>
            <AppText numberOfLines={2} style={styles.agentDescription}>{agent.description}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${agent.name}`} hitSlop={5} onPress={() => setEditor({ id: agent.id + ':AGENT', title: agent.name })} style={({ pressed }) => [styles.agentEdit, pressed && { opacity: 0.7 }]}><AppText style={styles.agentEditText}>Edit</AppText></Pressable>
          </View>)}
        </View>
        <AppText style={[styles.label, styles.connectorsLabel]}>Connectors</AppText>
        <ConnectorSettings />
        <Pressable accessibilityRole="button" onPress={() => setSettingsOpen(true)} style={styles.settingsEntry}><AppText style={styles.editLink}>Account settings</AppText></Pressable>
      </View>
    </ScrollView>
    {settingsOpen && <Modal animationType="slide" onRequestClose={() => setSettingsOpen(false)}><View style={[styles.screen, { paddingTop: Math.max(insets.top, 20) }]}><View style={styles.detailHeader}><AppText style={styles.detailTitle}>Account settings</AppText><Pressable accessibilityRole="button" onPress={() => setSettingsOpen(false)} style={styles.detailButton}><AppText style={styles.editLink}>Close</AppText></Pressable></View><ScrollView contentContainerStyle={{ paddingHorizontal: 27, paddingBottom: Math.max(insets.bottom, 20) }}><AccountSettings /></ScrollView></View></Modal>}
    {profileEditor && <ProfileEditor preferencesOnly={profileEditor === 'preferences'} onClose={() => setProfileEditor(null)} />}
    {editor && <MarkdownEditor key={editor.id} documentId={editor.id} title={editor.title} onClose={() => setEditor(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  settingsEntry: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: 24 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 56 },
  detailTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 18 },
  detailButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60 },
  hero: { flexDirection: 'row', alignItems: 'center', paddingLeft: 25, paddingRight: 27, gap: 17, paddingBottom: 40 },
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
  connectorsLabel: { marginTop: 34, marginBottom: 18 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  interest: { backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 25, borderRadius: 30, minHeight: 27 },
  interestText: { fontSize: 12, lineHeight: 15, letterSpacing: 0.12, color: '#dedede', textAlign: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, letterSpacing: 0.12, color: '#2468f5' },
  preferencesHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  editLink: { color: '#2468f5', fontSize: 12, lineHeight: 17, textDecorationLine: 'underline', letterSpacing: 0.14, paddingRight: 10 },
  preferenceList: { marginTop: 3, paddingHorizontal: 12 },
  preferenceRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.divider },
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
