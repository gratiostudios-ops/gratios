import React, { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { gateway } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import type { Agent } from '../data/types';
import { setupLabel } from '../data/marketplace';
import { registerPhonePush } from '../notifications';
import { ConnectorSettings } from './ConnectorSettings';
import { AppText } from './UI';
import { MarketButton, MarketError, MarketModal, MarketRows, ui } from './MarketplaceUI';

export function AgentSetup({ agent, onClose }: { agent: Agent; onClose(): void }) {
  const { refresh } = useAppData();
  const mounted = useRef(true);
  const [missing, setMissing] = useState(agent.missingSetup ?? []);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const load = async () => {
    const config = await gateway.request<{ agents: (Agent & { missingSetup?: string[] })[] }>('/gateway/config');
    const current = config.agents.find(item => item.id === agent.id);
    if (!current) throw new Error('Agent is no longer available.');
    if (!mounted.current) return;
    setMissing(current.missingSetup ?? []); await refresh();
  };
  useEffect(() => {
    let active = true; mounted.current = true;
    const update = () => { void load().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not refresh setup.'); }); };
    update(); const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { active = false; mounted.current = false; subscription.remove(); };
  }, [agent.id]);
  const run = async (action: () => Promise<void>, reload = true) => {
    if (busy || !mounted.current) return false;
    setBusy(true); setError('');
    try { await action(); if (reload && mounted.current) await load(); return mounted.current; }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not complete setup.'); return false; }
    finally { if (mounted.current) setBusy(false); }
  };
  const permissions = missing.filter(value => value.startsWith('permission:')).map(value => value.slice('permission:'.length));
  return <MarketModal title={'Set up ' + agent.name} onClose={onClose} busy={busy} compact>
    <AppText style={ui.body}>Connect the accounts this agent needs, then enable it.</AppText>
    {!!missing.length && <MarketRows items={missing.map(setupLabel)} />}
    <ConnectorSettings />
    {permissions.length > 0 && <MarketButton label="Allow required capabilities" busy={busy} onPress={() => { void run(async () => { for (const name of permissions) await gateway.request('/gateway/permissions/' + encodeURIComponent(name), { method: 'PUT', body: JSON.stringify({ granted: true }) }); }); }} />}
    {(agent.connectorIds?.includes('notifications') || missing.some(value => /push|notification/.test(value))) && <MarketButton label="Enable phone alerts" secondary busy={busy} onPress={() => { void run(async () => { const notice = await registerPhonePush(); if (notice) throw new Error(notice); }); }} />}
    <MarketError text={error} />
    <MarketButton label="Check setup" secondary busy={busy} onPress={() => { void run(load, false); }} />
    <MarketButton label="Enable agent" busy={busy} disabled={missing.length > 0} onPress={() => { void run(async () => { await gateway.request('/gateway/agents/' + encodeURIComponent(agent.id), { method: 'PATCH', body: JSON.stringify({ enabled: true }) }); }).then(success => { if (success) onClose(); }); }} />
  </MarketModal>;
}
