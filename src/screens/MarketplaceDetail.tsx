import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useMarketplace } from '../data/Marketplace';
import { useAppData } from '../data/AppData';
import { publishedVersion, setupLabel, toolLabel, type MarketDetail, type Installation } from '../data/marketplace';
import { AppText } from '../components/UI';
import { Consent, MarketArt, MarketButton, MarketError, MarketField, MarketModal, ui } from '../components/MarketplaceUI';
import { AccountSettings } from './AccountSettings';
import { MarkdownEditor } from './MarkdownEditor';

export function MarketplaceDetail({ listingId, initialInstallation, onClose }: { listingId: string; initialInstallation?: Installation; onClose(): void }) {
  const { api, installations, reload } = useMarketplace();
  const { refresh } = useAppData();
  const [detail, setDetail] = useState<MarketDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [fallbackInstallation, setFallbackInstallation] = useState(initialInstallation);
  const installed = removed ? undefined : installations.find(item => item.marketplace_agent_id === listingId) ?? fallbackInstallation;
  const load = () => { setLoading(true); setError(''); void api.detail(listingId).then(setDetail).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not load agent.')).finally(() => setLoading(false)); };
  useEffect(() => { let active = true; setLoading(true); void api.detail(listingId).then(value => { if (active) setDetail(value); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load agent.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [api, listingId]);
  const version = detail ? publishedVersion(detail) : undefined;
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); setNotice(''); try { await action(); const results = await Promise.allSettled([reload(), refresh()]); if (results.some(result => result.status === 'rejected')) setError('Your change was saved, but the agent list could not be refreshed. Reopen this screen to reload it.'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update agent.'); } finally { setBusy(false); } };
  return <MarketModal popup title={detail?.listing.name ?? installed?.name ?? 'Agent details'} onClose={onClose} busy={busy}>
    {loading && <ActivityIndicator color="#558dff" />}
    {detail && <>
      <View style={{ alignItems: 'center', gap: 12 }}><MarketArt image={detail.listing.artwork} size={110} /><AppText style={ui.heading}>{detail.listing.name}</AppText><AppText style={[ui.popupBody, { textAlign: 'center' }]}>{detail.listing.description}</AppText></View>
      {version && <><AppText style={ui.section}>{'Version ' + version.version_number + ' · Capabilities'}</AppText>{version.required_tools.map(name => <AppText key={name} style={ui.popupBody}>{'• ' + toolLabel(name)}</AppText>)}<AppText style={ui.section}>How this agent works</AppText><AppText selectable style={ui.popupBody}>{version.instructions}</AppText></>}
    </>}
    {!loading && !detail && <MarketButton label="Retry loading details" secondary onPress={load} />}
    {version && !installed && <>
      <MarketField label="Your private preferences" value={preferences} onChange={setPreferences} multiline />
      <AppText style={ui.popupBody}>Only your copy uses these preferences. Your connected accounts and conversations are never shared with the creator.</AppText>
      <Consent checked={accepted} onChange={setAccepted} label="Allow the capabilities listed above. Tool permissions are shared across my agents." />
      <MarketButton label="Add agent" disabled={!accepted} busy={busy} onPress={() => { void run(async () => {
        const result = await api.install(listingId, version.required_tools, preferences);
        setRemoved(false);
        setFallbackInstallation({ id: result.installationId!, agent_id: result.agentId, marketplace_agent_id: listingId, version_id: result.versionId ?? version.id, name: version.name, enabled: result.enabled ?? false, missing_setup: result.missingSetup, latest_published_version_id: version.id });
        setNotice(result.existing ? 'This agent is already in your Agent Manager. Its version and preferences have been kept.' : result.missingSetup.length ? 'Agent added. Complete the setup below before enabling it.' : 'Agent added to your orchestrator.');
      }); }} />
    </>}
    {installed && <>
      <AppText style={ui.section}>{installed.missing_setup.length ? 'Setup needed before this agent can run' : installed.enabled ? 'Enabled for your orchestrator' : 'Agent is paused'}</AppText>
      {installed.missing_setup.length > 0 && <View style={ui.card}><AppText style={ui.label}>Setup needed</AppText>{installed.missing_setup.map(step => <AppText key={step} style={ui.popupBody}>{'• ' + setupLabel(step)}</AppText>)}<MarketButton label="Open connection settings" secondary onPress={() => setSettings(true)} /></View>}
      <MarketButton label={installed.enabled ? 'Pause agent' : 'Enable agent'} busy={busy} onPress={() => { void run(async () => { const result = await api.enable(installed.id, !installed.enabled); setFallbackInstallation({ ...installed, enabled: !!result.enabled, missing_setup: result.missingSetup }); if (result.missingSetup.length) setNotice('Complete the required connections or permissions, then enable this agent.'); }); }} />
      <MarketButton label="Edit private preferences" secondary disabled={busy} onPress={() => setEditingPreferences(true)} />
      {version && installed.version_id !== version.id && <><AppText style={ui.section}>New version available</AppText><Consent checked={accepted} onChange={setAccepted} label="Update to the version shown above and allow its listed capabilities. My private preferences and history will be kept." /><MarketButton label={'Update to version ' + version.version_number} busy={busy} disabled={!accepted} onPress={() => { void run(async () => { const result = await api.update(installed.id, version.id, version.required_tools); setFallbackInstallation({ ...installed, version_id: version.id, enabled: !!result.enabled, missing_setup: result.missingSetup }); setNotice('Agent updated.'); setAccepted(false); }); }} /></>}
      <MarketButton label={confirmRemove ? 'Confirm remove agent' : 'Remove agent'} secondary busy={busy} onPress={() => { if (!confirmRemove) { setConfirmRemove(true); return; } void run(async () => { await api.uninstall(installed.id); setRemoved(true); setFallbackInstallation(undefined); setNotice('Agent removed. Its history is preserved and future schedules are cancelled.'); setConfirmRemove(false); }); }} />
      {confirmRemove && <MarketButton label="Keep agent" secondary onPress={() => setConfirmRemove(false)} />}
    </>}
    <MarketError text={error} />
    {!!notice && <AppText accessibilityLiveRegion="polite" style={ui.popupBody}>{notice}</AppText>}
    {settings && <MarketModal title="Connections and permissions" onClose={() => { setSettings(false); void reload().catch(() => {}); }}><AccountSettings /></MarketModal>}
    {editingPreferences && installed && <MarkdownEditor documentId={installed.agent_id + ':PREFERENCE'} title={installed.name + ' preferences'} onClose={() => setEditingPreferences(false)} />}
  </MarketModal>;
}
