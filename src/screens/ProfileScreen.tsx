import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import { imageSource } from '../assets';
import { Illustration } from '../components/Illustration';
import { AppText } from '../components/UI';
import { FloatingNavigation, type MenuActions } from '../components/Navigation';
import { colors, fonts } from '../theme';
import { MarkdownEditor } from './MarkdownEditor';

export function ProfileScreen(menuActions: MenuActions) {
  const { profile, agents, documents } = useAppData();
  const insets = useSafeAreaInsets();
  const [allInterests, setAllInterests] = useState(false);
  const [allPreferences, setAllPreferences] = useState(false);
  const [editor, setEditor] = useState<{ id: string; title: string } | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const preferences = (documents.preferences ?? '').split('\n').filter(line => /^\s*[-*]\s+/.test(line)).map(line => line.replace(/^\s*[-*]\s+/, ''));
  const heroOffset = Math.max(0, insets.top - 44);
  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 88 + insets.bottom }]}>
      <View style={[styles.hero, { height: 301 + heroOffset }]}>
        <LinearGradient colors={['#bbd0fa', '#1148bb']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.heroGradient, { height: 344 + heroOffset }]} />
        <Image source={imageSource(profile.avatar)} style={[styles.avatar, { top: 89 + heroOffset }]} resizeMode="cover" accessibilityLabel={`${profile.name}'s avatar`} />
        <LinearGradient pointerEvents="none" colors={['#27272700', '#0606067b', '#0b0b0bde', colors.background]} locations={[0, 0.4375, 0.798077, 1]} style={[styles.heroFade, { top: 170 + heroOffset }]} />
        <AppText style={[styles.name, { top: 232 + heroOffset }]}>{profile.name}</AppText>
        <AppText style={[styles.email, { top: 256 + heroOffset }]}>{profile.email}</AppText>
      </View>

      <View style={styles.body}>
        <AppText style={styles.label}>About you</AppText>
        <View style={styles.dob}><AppText style={styles.dobLabel}>DOB</AppText><AppText style={styles.dobValue}>{profile.dob}</AppText></View>
        <AppText style={styles.interestsLabel}>Interests</AppText>
        <View style={styles.interests}>{(allInterests ? profile.interests : profile.interests.slice(0, 3)).map((interest, index) => <View key={interest} style={[styles.interest, !allInterests && { flexBasis: 0, flexGrow: index === 1 ? 153.3 / 88.36 : 1, minWidth: 0, paddingHorizontal: 4 }]}><AppText numberOfLines={1} style={styles.interestText}>{interest}</AppText></View>)}</View>
        {profile.interests.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allInterests }} onPress={() => setAllInterests(previous => !previous)} hitSlop={8} style={styles.showAll}><AppText style={styles.link}>{allInterests ? 'show less −' : 'show all +'}</AppText></Pressable>}
        <View style={styles.sectionDivider} />

        <View style={styles.preferencesHeading}><AppText style={styles.label}>Preferences</AppText><Pressable accessibilityRole="button" accessibilityLabel="Edit preferences" hitSlop={12} onPress={() => setEditor({ id: 'preferences', title: 'Preferences' })}><AppText style={styles.editLink}>Edit</AppText></Pressable></View>
        <View style={styles.preferenceList}>{(allPreferences ? preferences : preferences.slice(0, 2)).map((preference, index) => <View key={`${index}-${preference}`} style={[styles.preferenceRow, index === 0 && { paddingTop: 0, paddingBottom: 12 }]}><AppText style={styles.preferenceText}>{preference}</AppText></View>)}</View>
        {preferences.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allPreferences }} onPress={() => setAllPreferences(previous => !previous)} hitSlop={8} style={styles.preferencesMore}><AppText style={styles.link}>{allPreferences ? 'show less −' : 'show all +'}</AppText></Pressable>}

        <AppText style={[styles.label, styles.agentsLabel]}>Agents running</AppText>
        <View style={styles.grid} onLayout={event => { if (event.nativeEvent.layout.width > 0) setGridWidth(event.nativeEvent.layout.width - 5); }}>
          <LinearGradient pointerEvents="none" colors={['#0d0d0d', '#0b0b0bdb', '#0a0a0ac6', '#00000000']} locations={[0, 0.447115, 0.716346, 1]} style={styles.agentsFade} />
          {agents.map(agent => <View key={agent.id} style={[styles.agentCard, { width: gridWidth ? (gridWidth - 11) / 2 : '48%' }]}>
            <View style={styles.agentArt}><Illustration image={agent.image} width={agent.icon === 'flight' ? 66 : agent.icon === 'gym' ? 126 : 101} height={agent.icon === 'flight' ? 63 : agent.icon === 'gym' ? 94 : 76} /></View>
            <View style={styles.agentNameArea}><AppText numberOfLines={2} style={styles.agentName}>{agent.name}</AppText></View>
            <AppText numberOfLines={2} style={styles.agentDescription}>{agent.description}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${agent.name}`} hitSlop={5} onPress={() => setEditor({ id: agent.id, title: agent.name })} style={({ pressed }) => [styles.agentEdit, pressed && { opacity: 0.7 }]}><AppText style={styles.agentEditText}>Edit</AppText></Pressable>
          </View>)}
        </View>
      </View>
    </ScrollView>
    <FloatingNavigation {...menuActions} />
    {editor && <MarkdownEditor key={editor.id} documentId={editor.id} title={editor.title} onClose={() => setEditor(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60 },
  hero: { overflow: 'hidden', alignItems: 'center' },
  heroGradient: { position: 'absolute', top: -2, left: 0, right: 0 },
  avatar: { width: 161, height: 161, position: 'absolute', backgroundColor: '#272727', borderRadius: 80.5 },
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
  agentEdit: { marginTop: 5, height: 27, borderRadius: 30, width: 115, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  agentEditText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17, letterSpacing: 0.14, color: colors.onBlue },
});
