import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { gateway, demoMode } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { useMarketplace } from '../data/Marketplace';
import type { Agent } from '../data/types';
import type { OwnListing } from '../data/marketplace';
import { AppText } from './UI';
import { AgentCreatorForm } from './AgentCreatorForm';
import { AgentSetup } from './AgentSetup';
import { MarketModal, MarketArt, MarketError, ui } from './MarketplaceUI';
import { PublishAgent } from '../screens/PublishAgent';
import { fonts } from '../theme';

export function AgentManager({ onEdit }: { onEdit(agent: Agent, readOnly?: boolean): void }) {
  const { agents, refresh } = useAppData();
  const { fontScale } = useWindowDimensions();
  const { api, mine, installations, error, reload, revision } = useMarketplace();
  const [editing, setEditing] = useState<OwnListing | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [setupAgent, setSetupAgent] = useState<Agent | null>(null);
  const [showAllPublic, setShowAllPublic] = useState(false);
  const [showAllPrivate, setShowAllPrivate] = useState(false);
  const [deleting,setDeleting]=useState<{kind:'private'|'public';id:string;name:string}|null>(null);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteError,setDeleteError]=useState('');
  const deleteLock=useRef(false);
  const [removedPrivate,setRemovedPrivate]=useState<Set<string>>(new Set());
  const [removedPublic,setRemovedPublic]=useState<Set<string>>(new Set());
  const visibleMine=mine.filter(listing=>!removedPublic.has(listing.id));
  const confirmDelete=async()=>{
    if(!deleting||deleteLock.current)return;
    deleteLock.current=true;setDeleteBusy(true);setDeleteError('');
    try{
      if(deleting.kind==='public'){
        await api.deleteListing(deleting.id);
        setRemovedPublic(previous=>new Set(previous).add(deleting.id));
      }else{
        await gateway.request('/gateway/agents/'+encodeURIComponent(deleting.id),{method:'DELETE'});
        setRemovedPrivate(previous=>new Set(previous).add(deleting.id));
        setConfigured(previous=>previous.filter(agent=>agent.id!==deleting.id));
      }
      setDeleting(null);
      await Promise.allSettled([refresh(),reload()]);
    }catch(failure){setDeleteError(failure instanceof Error?failure.message:'Could not delete agent.');}
    finally{deleteLock.current=false;setDeleteBusy(false);}
  };
  const chooseDelete=(kind:'private'|'public',id:string,name:string)=>{setDeleteError('');setDeleting({kind,id,name});};
  const [configured, setConfigured] = useState<(Agent & { role: string })[]>([]);
  useEffect(() => { let active = true; if (!demoMode) void gateway.request<{ agents: typeof configured }>('/gateway/config').then(value => { if (active) setConfigured(value.agents); }).catch(() => {}); return () => { active = false; }; }, [revision]);
  const privateAgents = agents.filter(agent=>!removedPrivate.has(agent.id));
  for (const summary of configured.filter(item => !removedPrivate.has(item.id) && item.role === 'agent' && (item.enabled || item.connectorIds || installations.some(installed => installed.agent_id === item.id)))) if (!privateAgents.some(agent => agent.id === summary.id)) {
    const installed = installations.find(item => item.agent_id === summary.id);
    privateAgents.push({ id: summary.id, name: summary.name, description: installed ? 'Installed from Marketplace' : 'Personal agent', enabled: summary.enabled, icon: summary.icon ?? 'brief', image: summary.image ?? { asset: 'brief' }, document: summary.document ?? '', connectorIds: summary.connectorIds, missingSetup: summary.missingSetup });
  }
  const row = (name: string, image: Agent['image'], label: string, onPress: () => void, key: string, status?: string, setup?: Agent, last = false, onDelete?:()=>void) => <View key={key} style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#303034' }}>
    <MarketArt image={image} size={40} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <AppText numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15 * Math.min(fontScale, 1.1), lineHeight: 20 * Math.min(fontScale, 1.1) }}>{name}</AppText>
      {!!status && <AppText numberOfLines={1} style={{ color: '#8a8a8f', fontFamily: fonts.regular, fontSize: 11 }}>{status}</AppText>}
      {setup && <Pressable accessibilityRole="button" accessibilityLabel={(setup.missingSetup?.length ? 'Finish setup for ' : 'Enable ') + name} onPress={() => setSetupAgent(setup)} style={{ minHeight: 30, justifyContent: 'center', alignSelf: 'flex-start' }}><AppText style={[ui.link, { color: '#2468f5', fontSize: 12 }]}>{setup.missingSetup?.length ? 'Finish setup' : 'Enable agent'}</AppText></Pressable>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={label + ' ' + name} onPress={onPress} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }}><AppText style={{ color: '#2468f5', fontFamily: fonts.semibold, fontSize: 13 }}>{label}</AppText></Pressable>
    {onDelete&&<Pressable accessibilityRole="button" accessibilityLabel={'Delete '+name} disabled={deleteBusy||demoMode} onPress={onDelete} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><AppText style={{color:'#ff453a',fontFamily:fonts.semibold,fontSize:13}}>Delete</AppText></Pressable>}
  </View>;
  return <View style={{ gap: 8, marginTop: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}><AppText style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.2, flex: 1 }}>My agents</AppText><Pressable accessibilityRole="button" onPress={() => setCreating(true)} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}><AppText style={[ui.link, { color: '#2468f5' }]}>Create +</AppText></Pressable></View>
    {visibleMine.length > 0 && <AppText style={{ color: '#ffffff', fontFamily: fonts.semibold, fontSize: 17 }}>Public</AppText>}
    <MarketError text={error} />
    {!!error && <Pressable accessibilityRole="button" onPress={() => { void reload().catch(() => {}); }}><AppText style={[ui.link, { color: '#2468f5' }]}>Retry loading marketplace</AppText></Pressable>}
    {visibleMine.length > 0 && <View accessibilityLabel="Your public agents">{(showAllPublic ? visibleMine : visibleMine.slice(0, 2)).map((listing, index, visible) => row(listing.name, listing.artwork, 'Manage', () => setEditing(listing), listing.id, listing.status === 'published' ? 'Published' : listing.status === 'draft' ? 'Draft' : 'Unpublished', undefined, index === visible.length - 1,()=>chooseDelete('public',listing.id,listing.name)))}
      {visibleMine.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllPublic }} onPress={() => setShowAllPublic(value => !value)} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}><AppText style={[ui.link, { color: '#2468f5', fontSize: 13 }]}>{showAllPublic ? 'Show less' : `Show all ${visibleMine.length} public agents`}</AppText></Pressable>}
    </View>}
    <View style={{ gap: 4 }}>
    <AppText style={{ color: '#ffffff', fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 }}>Private</AppText>
    {privateAgents.length > 0 && <View accessibilityLabel="Your private agents">{(showAllPrivate ? privateAgents : privateAgents.slice(0, 3)).map((agent, index, visible) => {
      const installed = installations.find(item => item.agent_id === agent.id);
      return row(agent.name, agent.image, installed ? 'View' : 'Edit', () => onEdit(agent, !!installed), agent.id, installed?.missing_setup.length || agent.missingSetup?.length ? 'Setup needed' : agent.enabled === false ? 'Paused' : undefined, agent.missingSetup?.length || agent.connectorIds && agent.enabled === false ? agent : undefined, index === visible.length - 1,()=>chooseDelete('private',agent.id,agent.name));
    })}
      {privateAgents.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAllPrivate }} onPress={() => setShowAllPrivate(value => !value)} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}><AppText style={[ui.link, { color: '#2468f5', fontSize: 13 }]}>{showAllPrivate ? 'Show less' : `Show all ${privateAgents.length} private agents`}</AppText></Pressable>}
    </View>}
    {!privateAgents.length && <AppText style={ui.body}>Add an agent from Marketplace to get started.</AppText>}
    </View>
    {deleting&&<MarketModal title={'Delete '+deleting.name+'?'} compact busy={deleteBusy} onClose={()=>{if(!deleteBusy)setDeleting(null);}}>
      <AppText style={ui.body}>{deleting.kind==='public'?'Remove this public listing and prevent new installs. Existing users keep their installed copies. Your private agent stays.':'Permanently remove this private agent, its cards, conversations, and schedules. Connected accounts and public listings stay.'}</AppText>
      <MarketError text={deleteError}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Confirm delete agent" disabled={deleteBusy} onPress={()=>{void confirmDelete();}} style={{minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:'#2b1619',borderRadius:14}}><AppText style={{color:'#ff453a',fontFamily:fonts.semibold,fontSize:16}}>{deleteBusy?'Deleting…':'Delete agent'}</AppText></Pressable>
      <Pressable accessibilityRole="button" disabled={deleteBusy} onPress={()=>setDeleting(null)} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><AppText style={ui.link}>Cancel</AppText></Pressable>
    </MarketModal>}
    {creating && <MarketModal title="Create an agent" compact busy={creatingBusy} onClose={() => setCreating(false)}><AgentCreatorForm onBusyChange={setCreatingBusy} onCreated={async () => { await refresh(); await reload().catch(() => {}); setCreating(false); }} /></MarketModal>}
    {editing && <PublishAgent listing={editing} onClose={() => setEditing(null)} />}
    {setupAgent && <AgentSetup agent={setupAgent} onClose={() => { setSetupAgent(null); void refresh().catch(() => {}); }} />}
  </View>;
}
