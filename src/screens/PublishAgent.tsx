import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { gateway, demoMode } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { useMarketplace } from '../data/Marketplace';
import type { DraftResult, MarketVersion, OwnListing } from '../data/marketplace';
import { PhosphorIcon } from '../components/PhosphorIcon';
import { marketplaceCover } from '../marketplace-covers';
import { marketplaceArtworkOptions, toolLabel } from '../data/marketplace';
import { AppText } from '../components/UI';
import { Consent, MarketButton, MarketError, MarketField, MarketModal, MarketDisclosure, PublishingArtworkPicker, ui } from '../components/MarketplaceUI';

export function PublishAgent({ listing, onClose }: { listing?: OwnListing; onClose(): void }) {
  const { api, installations, reload } = useMarketplace();
  const { agents } = useAppData();
  const [sources, setSources] = useState(agents.map(agent => ({ id: agent.id, name: agent.name, role: 'agent' })));
  const [result, setResult] = useState<DraftResult | null>(null);
  const [draft, setDraft] = useState<MarketVersion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => {
    let active = true;
    if (listing) {
      setBusy(true);
      void api.nextDraft(listing.id).then(value => { if (active) { setResult({ listing, draft: value.draft }); setDraft(value.draft); } }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load draft.'); }).finally(() => { if (active) setBusy(false); });
    } else if (!demoMode) {
      void gateway.request<{ agents: { id: string; name: string; role: string }[] }>('/gateway/config').then(value => { if (active) setSources(value.agents.filter(agent => agent.role === 'agent')); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load agents.'); });
    }
    return () => { active = false; };
  }, [api, listing]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save your agent.'); } finally { setBusy(false); }
  };
  const select = (id: string) => { void run(async () => { const value = await api.createDraft(id); setResult(value); setDraft(value.draft); }); };
  const save = async () => {
    if (!draft || !result) return;
    const saved = await api.saveDraft(result.listing.id, { name: draft.name.trim(), description: draft.description.trim(), instructions: draft.instructions.trim(), artwork: draft.artwork, requiredTools: draft.required_tools });
    setDraft(saved.draft); return saved.draft;
  };
  const installedIds = new Set(installations.map(item => item.agent_id));
  const available = sources.filter(agent => !installedIds.has(agent.id));
  return <MarketModal compact title={listing ? 'Manage public agent' : 'Publish an agent'} onClose={onClose} busy={busy}>
    <AppText style={ui.body}>Share an agent you already use. Your personal preferences, connected accounts, and conversations stay private.</AppText>
    {!draft && !busy && <MarketDisclosure title="Choose a private agent" summary="Select an agent to publish" defaultOpen>
      {available.map(agent => <Pressable key={agent.id} accessibilityRole="button" disabled={demoMode} onPress={() => select(agent.id)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2b2b2b' }}><AppText style={[ui.disclosureTitle, { flex: 1 }]}>{agent.name}</AppText><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><AppText style={ui.link}>Choose</AppText><PhosphorIcon name="arrow-right" size={18} color="#558dff" /></View></Pressable>)}
      {!available.length && <AppText style={ui.body}>No eligible private agents yet. Installed marketplace agents cannot be republished.</AppText>}
      {demoMode && <AppText style={ui.body}>Sign in to publish an agent.</AppText>}
    </MarketDisclosure>}
    {busy && !draft && <ActivityIndicator color="#558dff" />}
    {draft && <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Image source={marketplaceCover('', draft.artwork)} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="cover" /><View style={{ flex: 1 }}><AppText style={ui.disclosureTitle}>{draft.name}</AppText><AppText style={ui.disclosureSummary}>{'Version ' + draft.version_number}</AppText></View></View>
      <MarketDisclosure title="Agent name" summary={draft.name} defaultOpen>
        <MarketField label="Name" value={draft.name} maxLength={200} onChange={name => { setDraft({ ...draft, name }); setReviewed(false); }} />
      </MarketDisclosure>
      <MarketDisclosure title="Description" summary={draft.description || 'Describe what your agent does'}>
        <MarketField label="Description" value={draft.description} maxLength={2000} multiline onChange={description => { setDraft({ ...draft, description }); setReviewed(false); }} />
      </MarketDisclosure>
      <MarketDisclosure title="Artwork" summary={marketplaceArtworkOptions.find(option => option.asset === draft.artwork.asset)?.label ?? 'Choose a cover'}>
        <PublishingArtworkPicker selected={draft.artwork.asset} onSelect={asset => { setDraft({ ...draft, artwork: { asset } }); setReviewed(false); }} />
      </MarketDisclosure>
      <MarketDisclosure title="Public instructions" summary={draft.instructions || 'Explain how your agent works'}>
        <MarketField label="Instructions" value={draft.instructions} multiline onChange={instructions => { setDraft({ ...draft, instructions }); setReviewed(false); }} />
      </MarketDisclosure>
      <MarketDisclosure title="Capabilities" summary={draft.required_tools.length + ' selected'}>
        <AppText style={ui.disclosureSummary}>Chat replies and card updates are required.</AppText>
        {result?.draft.required_tools.map(name => <Consent key={name} label={toolLabel(name) + (['reply_chat', 'create_home_card'].includes(name) ? ' · required' : '')} checked={draft.required_tools.includes(name)} onChange={checked => { if (['reply_chat', 'create_home_card'].includes(name)) return; setDraft({ ...draft, required_tools: checked ? [...draft.required_tools, name] : draft.required_tools.filter(tool => tool !== name) }); setReviewed(false); }} />)}
      </MarketDisclosure>
      <MarketDisclosure title="Privacy review" summary={reviewed ? 'Reviewed' : 'Review before publishing'}>
        <Consent checked={reviewed} onChange={setReviewed} label="I reviewed the public instructions and removed personal information and secrets." />
      </MarketDisclosure>
      <MarketButton label={'Publish version ' + draft.version_number} busy={busy} disabled={!reviewed || !draft.name.trim() || !draft.instructions.trim()} onPress={() => { void run(async () => { const saved = await save(); if (saved && result) { await api.publish(result.listing.id, saved.id); void reload().catch(() => {}); onClose(); } }); }} />
      {listing?.status === 'published' && <MarketButton label="Unpublish listing" secondary busy={busy} onPress={() => { void run(async () => { await api.unpublish(listing.id); void reload().catch(() => {}); onClose(); }); }} />}
    </>}
    <MarketError text={error} />
    {!!message && <AppText accessibilityLiveRegion="polite" style={ui.body}>{message}</AppText>}
  </MarketModal>;
}
