import React, { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { gateway, useAuth } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';
import { ConnectorSettings } from '../components/ConnectorSettings';
import { registerPhonePush } from '../notifications';

type Configuration = { agents: { id: string; name: string; enabled: boolean; role?: string }[]; permissions: { toolName: string; granted: boolean }[] };
export function AccountSettings() {
  const { refresh, isDemo } = useAppData();
  const auth = useAuth();
  const [contact, setContact] = useState(false);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = async () => {
    setConfig(await gateway.request<Configuration>('/gateway/config'));
  };
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const update = () => { if (active) void load().catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Could not load settings.'); }); };
    update();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { active = false; subscription.remove(); };
  }, [isDemo]);
  if (isDemo) return null;
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update settings.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    {auth.requiresSignIn && <Pressable accessibilityRole="button" onPress={() => { void run(auth.reconnect); }} style={styles.button}><AppText style={styles.buttonText}>Sign in again</AppText></Pressable>}
    <AppText accessibilityRole="header" style={styles.title}>Agent access</AppText>
    {!config && <Pressable accessibilityRole="button" onPress={() => { void run(load); }} style={styles.secondary}><AppText style={styles.link}>Load settings</AppText></Pressable>}
    {config?.agents.filter(agent => !agent.role || agent.role === 'agent').map(agent => <View key={agent.id} style={styles.row}><AppText style={styles.choice}>{agent.name}</AppText><Switch accessibilityLabel={`Enable ${agent.name}`} value={agent.enabled} disabled={busy} onValueChange={enabled => { void run(async () => { await gateway.request('/gateway/agents/' + encodeURIComponent(agent.id), { method: 'PATCH', body: JSON.stringify({ enabled }) }); await load(); }); }} /></View>)}
    {config?.permissions.map(permission => <View key={permission.toolName} style={styles.row}><AppText style={styles.choice}>{permission.toolName}</AppText><Switch accessibilityLabel={`Allow ${permission.toolName}`} value={permission.granted} disabled={busy} onValueChange={granted => { void run(async () => { await gateway.request('/gateway/permissions/' + encodeURIComponent(permission.toolName), { method: 'PUT', body: JSON.stringify({ granted }) }); await load(); }); }} /></View>)}
    <AppText accessibilityRole="header" style={styles.title}>Connected accounts</AppText>
    <ConnectorSettings />
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => { const result = await registerPhonePush(); setMessage(result ?? 'Phone notifications registered.'); }); }}><AppText style={styles.link}>Enable phone notifications</AppText></Pressable>
    {message && <AppText accessibilityLiveRegion="polite" style={styles.body}>{message}</AppText>}
    {busy && <AppText accessibilityLiveRegion="polite" style={styles.body}>Updating…</AppText>}
    <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setContact(true)}><AppText style={styles.link}>Contact us</AppText></Pressable>
    <Modal visible={contact} transparent animationType="fade" onRequestClose={() => setContact(false)}>
      <View style={styles.scrim}><View style={styles.contactCard}>
        <AppText accessibilityRole="header" style={styles.contactTitle}>Contact us</AppText>
        <AppText style={styles.contactBody}>Avocado is running on your local machine. For connection problems, check the Gateway terminal and the local setup guide.</AppText>
        <Pressable accessibilityRole="button" onPress={() => setContact(false)} style={styles.close}><AppText style={styles.closeText}>Got it</AppText></Pressable>
      </View></View>
    </Modal>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(() => auth.logout()); }}><AppText style={styles.link}>Log out</AppText></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 28 },
  contactCard: { width: '100%', maxWidth: 360, padding: 26, backgroundColor: colors.surface, borderRadius: 18, gap: 18 },
  contactTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29 },
  contactBody: { color: colors.body, lineHeight: 21 },
  close: { minHeight: 40, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, color: colors.onBlue },
  card: { paddingVertical: 20, gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.divider }, title: { fontFamily: fonts.semibold, fontSize: 20 }, body: { color: colors.body, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, choice: { flex: 1, color: colors.body }, button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blue, borderRadius: 24 }, buttonText: { color: colors.onBlue, fontFamily: fonts.semibold },
  secondary: { minHeight: 44, justifyContent: 'center' }, link: { color: colors.blue },
});
