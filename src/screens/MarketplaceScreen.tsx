import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarketplaceDeck } from '../components/MarketplaceDeck';
import { MarketButton, MarketModal, ui } from '../components/MarketplaceUI';
import { AppText } from '../components/UI';
import { localMarketplace, localMarketIcon, marketIcons } from '../data/local-marketplace';
import type { MarketListing } from '../data/marketplace';
import { colors, fonts } from '../theme';
import { demoMode } from '../auth/Auth';
import { useMarketplace } from '../data/Marketplace';
import { MarketArt, MarketError } from '../components/MarketplaceUI';
import { MarketplaceDetail } from './MarketplaceDetail';
import { PublishAgent } from './PublishAgent';

export function MarketplaceScreen({ isActive, onContact }: { isActive: boolean; onContact(): void }) {
  const insets = useSafeAreaInsets();
  const { api, installations, reload, revision } = useMarketplace();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MarketListing | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewInstalled, setInstalled] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setInstalled(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const [catalog, setCatalog] = useState<MarketListing[]>([]);
  const [featured, setFeatured] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (demoMode || !isActive) return;
    const current = ++generation.current;
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      void Promise.all([api.catalog('top', query.trim()), api.catalog('featured')]).then(([top, picks]) => {
        if (current !== generation.current) return;
        setCatalog(top.agents);
        if (picks.agents.length || !query.trim()) setFeatured(picks.agents.length ? picks.agents : top.agents); setHasMore(top.agents.length === top.limit);
      }).catch(failure => { if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load agents.'); })
        .finally(() => { if (current === generation.current) setLoading(false); });
    }, query.trim() ? 250 : 0);
    return () => { clearTimeout(timer); generation.current++; };
  }, [api, isActive, query, revision, retry]);
  const more = async () => {
    if (loading) return;
    const current = generation.current;
    setLoading(true); setError('');
    try {
      const page = await api.catalog('top', query.trim(), catalog.length);
      if (current !== generation.current) return;
      setCatalog(previous => [...previous, ...page.agents.filter(item => !previous.some(existing => existing.id === item.id))]);
      setHasMore(page.agents.length === page.limit);
    } catch (failure) { if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load more agents.'); }
    finally { if (current === generation.current) setLoading(false); }
  };
  const rows = demoMode ? localMarketplace.filter(item => (item.name + ' ' + item.description).toLowerCase().includes(query.trim().toLowerCase())) : catalog;
  const deck = demoMode ? localMarketplace : featured;
  const installed = demoMode ? previewInstalled : new Set(installations.map(item => item.marketplace_agent_id));
  const add = (item: MarketListing) => { if (demoMode) toggle(item.id); else setSelected(item); };
  return <View style={styles.screen}>
    <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
    <ScrollView refreshControl={<RefreshControl refreshing={loading && !!catalog.length && !query} tintColor="#558dff" onRefresh={() => { setRetry(value => value + 1); void reload().catch(() => {}); }} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 30 }}>
      <View style={{ height: 40 }} />
      <View style={styles.hero}>
        <Image source={marketIcons.store} resizeMode="contain" style={styles.robot} />
        <Image source={marketIcons.search} resizeMode="contain" style={styles.searchArt} />
        <Image source={marketIcons.bag} resizeMode="contain" style={styles.shoppingArt} />
        <AppText accessibilityRole="header" style={styles.title}>Market Place</AppText>
        <AppText style={styles.subtitle}>Find best agents suites your{'\n'}personal taste and use</AppText>
        <Pressable accessibilityRole="button" onPress={() => setPublishing(true)} style={{ backgroundColor: '#2468f5', borderRadius: 22, paddingVertical: 8, paddingHorizontal: 28, alignItems: 'center', marginTop: 12 }}><AppText style={{ color: '#fff', fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }}>Publish Agent</AppText></Pressable>
      </View>
      <View style={{ paddingHorizontal: 35 }}><MarketplaceDeck key={deck.map(item => item.id).join(':')} items={deck} installed={installed} onOpen={setSelected} onAdd={add} /></View>
      <View style={styles.content}>
        <View style={styles.search}><TextInput accessibilityLabel="Search marketplace agents" placeholder="Search" placeholderTextColor="#555" value={query} onChangeText={setQuery} maxLength={200} style={styles.searchInput} returnKeyType="search" />{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><AppText style={{ color: '#aaa', fontSize: 21 }}>×</AppText></Pressable>}</View>
        <AppText style={styles.section}>{query.trim() ? 'Search results' : 'Top charts'}</AppText>
        {rows.filter(item => !demoMode || query.trim() || item.id !== 'deal-finder').map(item => <View key={item.id} style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={'View ' + item.name} onPress={() => setSelected(item)} style={styles.rowInfo}>{demoMode ? <Image source={localMarketIcon(item.id)} resizeMode="contain" style={{ width: 56, height: 56 }} /> : <MarketArt image={item.artwork} size={56} />}<View style={{ flex: 1, minWidth: 0, gap: 4 }}><AppText numberOfLines={2} style={styles.rowTitle}>{item.name}</AppText><AppText numberOfLines={2} style={styles.rowDescription}>{item.description}</AppText></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={(installed.has(item.id) ? 'Remove ' : 'Add ') + item.name} onPress={() => add(item)} style={styles.add}><AppText style={styles.addText}>{installed.has(item.id) ? 'View' : 'Add'}</AppText></Pressable>
        </View>)}
        <MarketError text={error} />
        {!!error && <MarketButton label="Retry" secondary onPress={() => setRetry(value => value + 1)} />}
        {loading && !rows.length && <ActivityIndicator color="#558dff" style={{ padding: 20 }} />}
        {!loading && !error && !rows.length && <AppText style={ui.body}>{query.trim() ? 'No agents found. Try another search.' : 'Published agents will appear here. Share one of your own.'}</AppText>}
        {hasMore && <MarketButton label="More agents" secondary busy={loading} onPress={() => { void more(); }} />}
      </View>
    </ScrollView>
    {selected && !demoMode && <MarketplaceDetail listingId={selected.id} onClose={() => setSelected(null)} />}
    {selected && demoMode && <MarketModal popup title={selected.name} onClose={() => setSelected(null)}><Image source={localMarketIcon(selected.id)} resizeMode="contain" style={{ width: 150, height: 150, alignSelf: 'center' }} /><AppText style={ui.popupBody}>{selected.description}</AppText><MarketButton label={installed.has(selected.id) ? 'Remove agent' : 'Add agent'} onPress={() => toggle(selected.id)} /><AppText style={ui.popupBody}>Preview only. Your selection stays on this screen; no services are connected.</AppText></MarketModal>}
    {publishing && <PublishAgent onClose={() => setPublishing(false)} />}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 }, contact: { alignSelf: 'flex-end', marginRight: 28, minHeight: 40, justifyContent: 'center' }, contactText: { color: '#686868', textDecorationLine: 'underline', fontSize: 13 }, hero: { alignItems: 'center', paddingTop: 35, paddingBottom: 34, position: 'relative' }, title: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.5, color: '#fff' }, subtitle: { color: '#929292', fontFamily: fonts.medium, textAlign: 'center', fontSize: 19, lineHeight: 22, marginTop: 5 }, robot: { position: 'absolute', width: 62, height: 62, top: -5, left: '16%', transform: [{ rotate: '-12deg' }] }, searchArt: { position: 'absolute', width: 56, height: 56, top: 12, right: '15%', transform: [{ rotate: '12deg' }] }, shoppingArt: { position: 'absolute', width: 49, height: 49, bottom: 18, right: '14%', transform: [{ rotate: '12deg' }] }, content: { paddingHorizontal: 35, paddingTop: 38, gap: 10 }, search: { minHeight: 45, borderRadius: 25, backgroundColor: '#1b1b1b', flexDirection: 'row', alignItems: 'center', paddingLeft: 36, gap: 10 }, searchInput: { flex: 1, minHeight: 48, color: '#fff', fontSize: 14 }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, section: { fontFamily: fonts.semibold, color: '#558dff', fontSize: 15, marginTop: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 77, borderBottomWidth: 1, borderBottomColor: '#2b2b2b', paddingVertical: 12 }, rank: { color: '#666', fontSize: 12, width: 16, textAlign: 'center' }, rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }, rowTitle: { color: '#ddd', fontFamily: fonts.semibold, fontSize: 15 }, rowDescription: { color: '#929292', fontSize: 12, lineHeight: 17 }, add: { backgroundColor: '#2468f5', minWidth: 60, minHeight: 32, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, addText: { color: '#fff', fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold }, empty: { paddingVertical: 28, alignItems: 'center', gap: 12 }, emptyTitle: { fontFamily: fonts.semibold, color: '#ccc', fontSize: 16, textAlign: 'center' },
});
