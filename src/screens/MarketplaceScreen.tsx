import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { demoMode } from '../auth/Auth';
import { agentStickers } from '../agent-icons';
import { useMarketplace } from '../data/Marketplace';
import type { MarketListing } from '../data/marketplace';
import { MarketplaceDeck } from '../components/MarketplaceDeck';
import { MarketArt, MarketButton, MarketError, ui } from '../components/MarketplaceUI';
import { AppText } from '../components/UI';
import { fonts } from '../theme';
import { MarketplaceDetail } from './MarketplaceDetail';
import { PublishAgent } from './PublishAgent';

export function MarketplaceScreen({ isActive, onContact }: { isActive: boolean; onContact(): void }) {
  const { api, installations, reload, revision } = useMarketplace();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<MarketListing[]>([]);
  const [featured, setFeatured] = useState<MarketListing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!isActive || demoMode) return;
    const current = ++generation.current;
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      void Promise.all([api.catalog('top', query.trim()), api.catalog('featured')]).then(([top, picks]) => {
        if (current !== generation.current) return;
        setRows(top.agents); setHasMore(top.agents.length === top.limit); setFeatured(picks.agents); setError('');
      }).catch(failure => { if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load marketplace.'); }).finally(() => { if (current === generation.current) setLoading(false); });
    }, query ? 280 : 0);
    return () => { clearTimeout(timer); generation.current++; };
  }, [api, isActive, query, retry, revision]);
  const more = async () => {
    if (loading) return;
    const current = generation.current;
    setLoading(true);
    try { const page = await api.catalog('top', query.trim(), rows.length); if (current !== generation.current) return; setRows(previous => [...previous, ...page.agents.filter(item => !previous.some(existing => existing.id === item.id))]); setHasMore(page.agents.length === page.limit); }
    catch (failure) { if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load more agents.'); }
    finally { if (current === generation.current) setLoading(false); }
  };
  const installed = new Set(installations.map(item => item.marketplace_agent_id));
  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={loading && !query && !!rows.length} tintColor="#558dff" onRefresh={() => { setRetry(value => value + 1); void reload().catch(() => {}); }} />}>
      <Pressable accessibilityRole="button" onPress={onContact} style={styles.contact}><AppText style={styles.contactText}>Contact us</AppText></Pressable>
      <View style={styles.hero}>
        <Image source={agentStickers['sticker-robot'].source} style={styles.robot} />
        <Image source={agentStickers['sticker-search'].source} style={styles.searchArt} />
        <Image source={agentStickers['sticker-shopping'].source} style={styles.shoppingArt} />
        <AppText accessibilityRole="header" style={styles.title}>Market Place</AppText>
        <AppText style={styles.subtitle}>Find the best agents for your{ '\n' }personal taste and everyday life.</AppText>
        <View style={{ alignSelf: 'center', marginTop: 16 }}><MarketButton label="Publish Agent" onPress={() => setPublishing(true)} /></View>
      </View>
      <View style={{ paddingHorizontal: 20 }}><MarketplaceDeck items={featured} installed={installed} onOpen={item => setSelected(item.id)} /></View>
      <View style={styles.content}>
        <View style={styles.search}><Image source={agentStickers['sticker-search'].source} style={{ width: 23, height: 23, opacity: 0.6 }} /><TextInput accessibilityLabel="Search marketplace agents" placeholder="Search agents" placeholderTextColor="#666" value={query} onChangeText={setQuery} maxLength={200} style={styles.searchInput} returnKeyType="search" />{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><AppText style={{ color: '#aaa', fontSize: 21 }}>×</AppText></Pressable>}</View>
        <AppText style={styles.section}>{query.trim() ? 'Search results' : 'Top charts'}</AppText>
        <MarketError text={error} />
        {!!error && <MarketButton label="Retry" secondary onPress={() => setRetry(value => value + 1)} />}
        {loading && !rows.length && <ActivityIndicator color="#558dff" style={{ padding: 24 }} />}
        {!loading && !error && !rows.length && <View style={styles.empty}><MarketArt image={{ asset: 'sticker-globe' }} size={65} /><AppText style={styles.emptyTitle}>{query ? 'No agents found' : 'A world of agents, coming together'}</AppText><AppText style={ui.body}>{query ? 'Try a different name or keyword.' : 'Published agents will appear here. Share one of your own to get started.'}</AppText></View>}
        {rows.map((item, index) => <View key={item.id} style={styles.row}>
          <AppText style={styles.rank}>{index + 1}</AppText><Pressable accessibilityRole="button" accessibilityLabel={'View ' + item.name} onPress={() => setSelected(item.id)} style={styles.rowInfo}><MarketArt image={item.artwork} size={56} /><View style={{ flex: 1, gap: 4 }}><AppText numberOfLines={1} style={styles.rowTitle}>{item.name}</AppText><AppText numberOfLines={2} style={styles.rowDescription}>{item.description}</AppText></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={(installed.has(item.id) ? 'Manage ' : 'Add ') + item.name} onPress={() => setSelected(item.id)} style={styles.add}><AppText style={styles.addText}>{installed.has(item.id) ? 'View' : 'Add'}</AppText></Pressable>
        </View>)}
        {hasMore && <MarketButton label="More agents" secondary busy={loading} onPress={() => { void more(); }} />}
      </View>
    </ScrollView>
    {selected && <MarketplaceDetail listingId={selected} onClose={() => setSelected(null)} />}
    {publishing && <PublishAgent onClose={() => setPublishing(false)} />}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d0d' }, contact: { alignSelf: 'flex-end', marginRight: 28, minHeight: 40, justifyContent: 'center' }, contactText: { color: '#686868', textDecorationLine: 'underline', fontSize: 13 }, hero: { alignItems: 'center', paddingTop: 35, paddingBottom: 20, position: 'relative' }, title: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.5, color: '#fff' }, subtitle: { color: '#929292', fontFamily: fonts.medium, textAlign: 'center', fontSize: 18, lineHeight: 23, marginTop: 5 }, robot: { position: 'absolute', width: 62, height: 62, top: -5, left: '16%', transform: [{ rotate: '-12deg' }] }, searchArt: { position: 'absolute', width: 56, height: 56, top: 12, right: '15%', transform: [{ rotate: '12deg' }] }, shoppingArt: { position: 'absolute', width: 49, height: 49, bottom: 18, right: '14%', transform: [{ rotate: '12deg' }] }, content: { paddingHorizontal: 28, paddingTop: 10, gap: 10 }, search: { minHeight: 48, borderRadius: 25, backgroundColor: '#1b1b1b', flexDirection: 'row', alignItems: 'center', paddingLeft: 18, gap: 10 }, searchInput: { flex: 1, minHeight: 48, color: '#fff', fontSize: 14 }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, section: { fontFamily: fonts.semibold, color: '#558dff', fontSize: 15, marginTop: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 90, borderBottomWidth: 1, borderBottomColor: '#2b2b2b', paddingVertical: 12 }, rank: { color: '#666', fontSize: 12, width: 16, textAlign: 'center' }, rowInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, rowTitle: { color: '#ddd', fontFamily: fonts.semibold, fontSize: 15 }, rowDescription: { color: '#929292', fontSize: 12, lineHeight: 15 }, add: { backgroundColor: '#2468f5', minWidth: 60, minHeight: 40, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, addText: { color: '#fff', fontSize: 14, fontFamily: fonts.semibold }, empty: { paddingVertical: 28, alignItems: 'center', gap: 12 }, emptyTitle: { fontFamily: fonts.semibold, color: '#ccc', fontSize: 16, textAlign: 'center' },
});
