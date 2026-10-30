import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { gateway, demoMode } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { useMarketplace } from '../data/Marketplace';
import type { Agent } from '../data/types';
import type { Installation, OwnListing } from '../data/marketplace';
import { AppText } from './UI';
import { MarketArt, MarketError, ui } from './MarketplaceUI';
import { PublishAgent } from '../screens/PublishAgent';
import { MarketplaceDetail } from '../screens/MarketplaceDetail';
import { fonts } from '../theme';

export function AgentManager({ onEdit }: { onEdit(agent: Agent): void }) {
  const { agents } = useAppData();
  const { fontScale } = useWindowDimensions();
  const cardHeight = Math.ceil(160 + 104 * Math.max(1, fontScale));
  const cardWidth = Math.max(174, Math.ceil(164 * Math.min(fontScale, 1.4)));
  const { mine, installations, error, reload, revision } = useMarketplace();
  const [editing, setEditing] = useState<OwnListing | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [selected, setSelected] = useState<Installation | null>(null);
  const [configured, setConfigured] = useState<{ id: string; name: string; enabled: boolean; role: string }[]>([]);
  useEffect(() => { let active = true; if (!demoMode) void gateway.request<{ agents: typeof configured }>('/gateway/config').then(value => { if (active) setConfigured(value.agents); }).catch(() => {}); return () => { active = false; }; }, [revision]);
  const privateAgents = [...agents];
  for (const summary of configured.filter(item => item.role === 'agent' && (item.enabled || installations.some(installed => installed.agent_id === item.id)))) if (!privateAgents.some(agent => agent.id === summary.id)) {
    const installed = installations.find(item => item.agent_id === summary.id);
    privateAgents.push({ id: summary.id, name: summary.name, description: installed ? 'Installed from Marketplace' : 'Personal agent', enabled: summary.enabled, icon: 'brief', image: { asset: 'brief' }, document: '' });
  }
  const card = (name: string, description: string, image: Agent['image'], label: string, onPress: () => void, key: string, status?: string, horizontal = false) => <View key={key} style={{ width: horizontal ? cardWidth : '48%', backgroundColor: '#1b1b1b', borderRadius: 15, padding: 16, alignItems: 'center', minHeight: 214, height: horizontal ? cardHeight : undefined, gap: 6 }}>
    <MarketArt image={image} size={76} /><AppText numberOfLines={2} style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, textAlign: 'center' }}>{name}</AppText><AppText numberOfLines={2} style={{ color: '#858585', fontSize: 12, lineHeight: 17, textAlign: 'center', flex: 1 }}>{description}</AppText>{!!status && <AppText style={{ color: '#91adf0', fontSize: 11 }}>{status}</AppText>}<Pressable accessibilityRole="button" accessibilityLabel={label + ' ' + name} onPress={onPress} style={{ backgroundColor: '#2468f5', borderRadius: 20, minHeight: 34, paddingHorizontal: 30, justifyContent: 'center', marginTop: 4 }}><AppText style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 13 }}>{label}</AppText></Pressable>
  </View>;
  return <View style={{ gap: 8, marginTop: 28 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><AppText style={[ui.label, { flex: 1 }]}>Agent Manager</AppText><Pressable accessibilityRole="button" onPress={() => setPublishing(true)} hitSlop={12} style={{ minHeight: 20, justifyContent: 'center' }}><AppText style={ui.link}>Publish +</AppText></Pressable></View>
    {mine.length > 0 && <AppText style={{ color: '#858585', fontFamily: fonts.semibold, fontSize: 14 }}>Public</AppText>}
    <MarketError text={error} />
    {!!error && <Pressable accessibilityRole="button" onPress={() => { void reload().catch(() => {}); }}><AppText style={ui.link}>Retry loading marketplace</AppText></Pressable>}
    {mine.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} nestedScrollEnabled snapToInterval={cardWidth + 12} decelerationRate="fast" accessibilityLabel="Your public agents" contentContainerStyle={{ gap: 12, paddingRight: 6, paddingBottom: 6 }} style={{ height: cardHeight + 6, flexGrow: 0, marginRight: 0 }}>{mine.map(listing => card(listing.name, listing.description, listing.artwork, 'Manage', () => setEditing(listing), listing.id, listing.status === 'published' ? 'Published' : listing.status === 'draft' ? 'Draft' : 'Unpublished', true))}</ScrollView>}
    <View style={{ gap: 8 }}>
    <AppText style={{ color: '#858585', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17 }}>Private</AppText>
    {privateAgents.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} nestedScrollEnabled snapToInterval={cardWidth + 12} decelerationRate="fast" accessibilityLabel="Your private agents" contentContainerStyle={{ gap: 12, paddingRight: 6, paddingBottom: 6 }} style={{ height: cardHeight + 6, flexGrow: 0, marginRight: 0 }}>{privateAgents.map(agent => {
      const installed = installations.find(item => item.agent_id === agent.id);
      return card(agent.name, agent.description, agent.image, 'Edit', () => installed ? setSelected(installed) : onEdit(agent), agent.id, installed?.missing_setup.length ? 'Setup needed' : agent.enabled === false ? 'Paused' : undefined, true);
    })}</ScrollView>}
    {!privateAgents.length && <AppText style={ui.body}>Add an agent from Marketplace to get started.</AppText>}
    </View>
    {(editing || publishing) && <PublishAgent listing={editing ?? undefined} onClose={() => { setEditing(null); setPublishing(false); }} />}
    {selected && <MarketplaceDetail listingId={selected.marketplace_agent_id} initialInstallation={selected} onClose={() => setSelected(null)} />}
  </View>;
}
