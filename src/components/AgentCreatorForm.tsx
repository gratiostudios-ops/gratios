import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { gateway, demoMode } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import type { ConnectionId } from '../data/connection-options';
import { agentMarkdownError, agentTemplate, connectorSummary, type CreatedAgent } from '../data/agent-creator';
import type { MarketplaceArtwork } from '../data/marketplace';
import { ConnectionPicker } from './ConnectionPicker';
import { AgentIconPicker } from './AgentIconPicker';
import { AppText } from './UI';
import { MarketButton, MarketDisclosure, MarketError, MarketField, ui } from './MarketplaceUI';

export function AgentCreatorForm({ onCreated, onBusyChange }: { onCreated(agent: CreatedAgent): void | Promise<void>; onBusyChange?(busy: boolean): void }) {
  const { refresh } = useAppData();
  const [connectors, setConnectors] = useState<ConnectionId[]>([]);
  const [markdown, setMarkdown] = useState(() => agentTemplate([]));
  const [icon, setIcon] = useState<MarketplaceArtwork>({ asset: 'brief' });
  const [busy, setBusy] = useState(false), [imageBusy, setImageBusy] = useState(false), [error, setError] = useState('');
  const iconEdited = useRef(false);
  const edited = useRef(false), request = useRef({ id: Crypto.randomUUID(), payload: '' });
  const setConnections = (selected: ConnectionId[]) => { setConnectors(selected); if (!edited.current) setMarkdown(agentTemplate(selected)); if (!iconEdited.current) setIcon({ asset: selected[0] === 'gmail' ? 'mail' : selected[0] === 'calendar' || selected[0] === 'tasks' ? 'calendar' : 'brief' }); };
  const create = async () => {
    if (busy || imageBusy) return;
    const validation = agentMarkdownError(markdown); if (validation) { setError(validation); return; }
    const payload = JSON.stringify({ connectorIds: connectors, agentMd: markdown.trim(), icon: icon.mediaId ? { mediaId: icon.mediaId } : icon });
    if (request.current.payload && request.current.payload !== payload) request.current = { id: Crypto.randomUUID(), payload };
    request.current.payload = payload;
    setBusy(true); setError(''); onBusyChange?.(true);
    try {
      const result = await gateway.request<{ agent: CreatedAgent }>('/gateway/agents', { method: 'POST', body: JSON.stringify({ requestId: request.current.id, ...JSON.parse(payload) }) });
      await refresh().catch(() => {});
      await onCreated(result.agent);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not create agent. Your instructions are kept here.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  return <View style={{ gap: 12 }}>
    <AppText style={ui.body}>Choose what your agent can use, then describe how it should help. The first heading in AGENT.md is its name.</AppText>
    <MarketDisclosure title="Connections" summary={connectorSummary(connectors)} defaultOpen><ConnectionPicker selected={connectors} onChange={setConnections} disabled={busy || imageBusy} /></MarketDisclosure>
    <MarketDisclosure title="Agent icon" summary={icon.mediaId ? 'Uploaded icon' : 'Choose an existing icon or upload'}><AgentIconPicker value={icon} onChange={value => { iconEdited.current = true; setIcon(value); }} disabled={busy} onBusyChange={value => { setImageBusy(value); onBusyChange?.(value); }} /></MarketDisclosure>
    <MarketDisclosure title="AGENT.md" summary="Instructions for your agent" defaultOpen><MarketField label="Markdown instructions" value={markdown} maxLength={16000} multiline onChange={value => { edited.current = true; setMarkdown(value); }} /></MarketDisclosure>
    <AppText style={ui.disclosureSummary}>Creating allows the selected capabilities, including supported changes to Calendar and Tasks. Account permissions are shared across agents. Agents with missing connections are saved paused.</AppText>
    <MarketError text={error} />
    {demoMode && <AppText style={ui.body}>Sign in to create a working agent.</AppText>}
    <MarketButton label="Create agent" busy={busy} disabled={demoMode || imageBusy || !!agentMarkdownError(markdown)} onPress={() => { void create(); }} />
  </View>;
}
