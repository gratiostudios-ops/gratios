import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useState } from 'react';
import { Image, Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppData';
import type { FeedItem } from '../data/types';
import { SafeImage } from '../components/SafeImage';
import { AppText } from '../components/UI';
import { type MenuActions } from '../components/Navigation';
import { colors, fonts } from '../theme';

export function SuggestionsScreen(menuActions: MenuActions) {
  const { feed } = useAppData();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const selectedDate = feed.find(group => group.items.some(item => item.id === selected?.id))?.dateLabel;
  const openLink = async (url: string) => {
    setLinkError(null);
    try { await Linking.openURL(url); }
    catch { setLinkError('Could not open this link. Please try again.'); }
  };
  return <View style={[styles.screen, { paddingBottom: insets.bottom + 80 }]}>
    <View style={[styles.heading, { paddingTop: insets.top + 64 }]}>
      <AppText accessibilityRole="header" style={styles.headingText}>Suggestions</AppText>
    </View>
    <View style={styles.listArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {feed.map(group => <View key={group.id} style={styles.group}>
          <AppText accessibilityRole="header" style={styles.date}>{group.dateLabel}</AppText>
          {group.items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => { setLinkError(null); setSelected(item); }} style={({ pressed }) => [styles.item, pressed && { opacity: 0.65 }]}>
            <View style={styles.thumbnail}><SafeImage image={item.image} style={styles.fittedImage} resizeMode="cover" /></View>
            <View style={styles.itemText}>
              <AppText numberOfLines={1} style={styles.title}>{item.title}</AppText>
              <AppText numberOfLines={2} ellipsizeMode="tail" style={styles.description}>{item.description}</AppText>
            </View>
            <View style={styles.itemDivider} />
          </Pressable>)}
        </View>)}
        {feed.length === 0 && <AppText style={styles.empty}>Your agents’ published updates will appear here.</AppText>}

      </ScrollView>
      <LinearGradient pointerEvents="none" colors={['#080808', '#080808e5', '#080808cc', '#08080895', '#08080800']} locations={[0, 0.201923, 0.427885, 0.605769, 1]} style={styles.topFade} />
      <LinearGradient pointerEvents="none" colors={['#0d0d0d00', '#0d0d0d95', '#0d0d0dcc', '#0d0d0de5', '#0d0d0d']} locations={[0, 0.394231, 0.572115, 0.798077, 1]} style={styles.bottomFade} />
    </View>
    <Modal visible={selected !== null} animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setSelected(null)}>
      <View style={[styles.detail, { paddingTop: Math.max(20, insets.top), paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
        {selected && <StatusBar hidden={false} style="light" />}
        <View style={styles.detailHeader}><View style={styles.headerContent}>
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.back}><AppText style={styles.backText}>← Suggestions</AppText></Pressable>
        </View></View>
        {selected && <ScrollView key={selected.id} style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
          <View style={styles.detailImage}><SafeImage image={selected.image} style={styles.fittedImage} resizeMode="contain" accessibilityLabel={selected.title} /></View>
          <AppText style={styles.detailMeta}>{selectedDate} · For you</AppText>
          <AppText accessibilityRole="header" style={styles.detailTitle}>{selected.title}</AppText>
          <AppText style={styles.detailDescription}>{selected.description}</AppText>
          <AppText style={styles.detailBody}>{selected.body}</AppText>
          {selected.sections?.map(section => <View key={section.id} style={styles.detailSection}>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>{section.title}</AppText>
            {section.paragraphs?.map((paragraph, index) => <AppText key={index} style={styles.sectionParagraph}>{paragraph}</AppText>)}
            {section.points?.map((point, index) => <View key={index} style={styles.point}>
              <AppText style={styles.pointBullet}>•</AppText><AppText style={styles.pointText}>{point}</AppText>
            </View>)}
          </View>)}
          {!!selected.links?.length && <View style={styles.resources}>
            <AppText accessibilityRole="header" style={styles.sectionTitle}>Explore more</AppText>
            {selected.links.map(link => <Pressable key={link.id} accessibilityRole="link" accessibilityLabel={link.label} accessibilityHint="Opens in your browser" onPress={() => { void openLink(link.url); }} style={({ pressed }) => [styles.resource, pressed && { opacity: 0.65 }]}>
              <View style={styles.resourceCopy}><AppText style={styles.resourceLabel}>{link.label}</AppText><AppText style={styles.resourceCaption}>{link.caption ?? link.url}</AppText></View>
              <AppText style={styles.resourceArrow}>↗</AppText>
            </Pressable>)}
            {linkError && <AppText accessibilityLiveRegion="polite" style={styles.linkError}>{linkError}</AppText>}
          </View>}
        </ScrollView>}
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.feedBackground },
  heading: { paddingHorizontal: 26, paddingBottom: 45 },
  headingText: { fontFamily: fonts.serifBold, fontSize: 28, lineHeight: 34, color: '#d4d4d4' },
  listArea: { flex: 1, overflow: 'hidden' },
  list: { paddingTop: 21, paddingLeft: 40, paddingRight: 22, paddingBottom: 30 },
  group: { marginBottom: 1 },
  date: { fontFamily: fonts.date, color: '#b1b1b1', fontSize: 12, lineHeight: 15, marginLeft: -2, marginBottom: 15 },
  item: { flexDirection: 'row', gap: 18, minHeight: 98, paddingTop: 0, paddingBottom: 25, marginBottom: 4 },
  thumbnail: { width: 75, height: 63, flexShrink: 0, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.surface },
  fittedImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  itemText: { flex: 1, minWidth: 0, paddingBottom: 16 },
  itemDivider: { position: 'absolute', left: 28, right: 0, top: 74, height: 1, backgroundColor: '#222222' },
  title: { fontFamily: fonts.feedBold, color: '#dbdbdb', fontSize: 15, lineHeight: 21 },
  description: { fontFamily: fonts.feed, color: '#b7b7b7', fontSize: 12, lineHeight: 18, marginTop: 1 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 21 },
  empty: { color: colors.muted, paddingVertical: 30 },
  detail: { flex: 1, backgroundColor: colors.background },
  detailHeader: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerContent: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 26 },
  back: { minHeight: 56, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.blue, fontFamily: fonts.medium },
  detailScroll: { flex: 1 },
  detailContent: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 32, width: '100%', maxWidth: 680, alignSelf: 'center' },
  detailImage: { width: '100%', height: 200, borderRadius: 13, overflow: 'hidden', backgroundColor: colors.surface },
  detailMeta: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 18 },
  detailTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, marginTop: 10 },
  detailDescription: { fontSize: 16, lineHeight: 24, color: colors.body, marginTop: 12 },
  detailBody: { fontSize: 14, lineHeight: 23, color: colors.secondary, marginTop: 20 },
  detailSection: { marginTop: 24 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23 },
  sectionParagraph: { fontSize: 14, lineHeight: 23, color: colors.body, marginTop: 10 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  pointBullet: { width: 10, color: colors.blue, lineHeight: 23 },
  pointText: { flex: 1, color: colors.body, lineHeight: 23 },
  resources: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.divider },
  resource: { marginTop: 12, minHeight: 68, backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resourceCopy: { flex: 1 },
  resourceLabel: { fontFamily: fonts.medium, color: colors.blue, fontSize: 14, lineHeight: 20 },
  resourceCaption: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  resourceArrow: { color: colors.blue, fontSize: 20, lineHeight: 24 },
  linkError: { color: colors.task, lineHeight: 20, marginTop: 12 },
});
