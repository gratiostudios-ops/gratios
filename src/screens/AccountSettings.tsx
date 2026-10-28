import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { gateway, useAuth } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';
import { registerPhonePush } from '../notifications';

type Configuration = { agents: { id: string; name: string; enabled: boolean; role?: string }[]; permissions: { toolName: string; granted: boolean }[] };
type GmailStatus = { connected: boolean; status: string; accountEmail: string | null };
export function AccountSettings() {
  const { refresh, isDemo } = useAppData();
  const auth = useAuth();
  const [config, setConfig] = useState<Configuration | null>(null);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = async () => {
    setConfig(await gateway.request<Configuration>('/gateway/config'));
    try { setGmail(await gateway.request<GmailStatus>('/integrations/gmail')); } catch { setGmail(null); }
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
    <AppText style={styles.body}>{gmail?.connected ? 'Gmail connected: ' + gmail.accountEmail : 'Gmail is not connected'}</AppText>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void run(async () => {
      const result=await gateway.request<{authorizationUrl:string}>('/integrations/calendar/connect',{method:'POST',body:'{}'});
      if(new URL(result.authorizationUrl).origin!=='https://accounts.google.com')throw new Error('Invalid Google URL');
      await Linking.openURL(result.authorizationUrl);
    }); }}><AppText style={styles.buttonText}>Connect Google Calendar</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void run(async () => {await gateway.request('/integrations/calendar',{method:'DELETE'});await refresh();setMessage('Calendar disconnected');}); }}><AppText style={styles.body}>Disconnect Calendar</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void run(async () => {
      const result = await gateway.request<{ authorizationUrl: string }>('/integrations/gmail/connect', { method: 'POST', body: '{}' });
      if (new URL(result.authorizationUrl).origin !== 'https://accounts.google.com') throw new Error('Invalid Google authorization URL.');
      await Linking.openURL(result.authorizationUrl);
    }); }}><AppText style={styles.buttonText}>{gmail?.connected ? 'Reconnect Gmail' : 'Connect Gmail'}</AppText></Pressable>
    {gmail?.connected && <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => { await gateway.request('/integrations/gmail', { method: 'DELETE' }); await load(); }); }}><AppText style={styles.link}>Disconnect Gmail</AppText></Pressable>}
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => { const result = await registerPhonePush(); setMessage(result ?? 'Phone notifications registered.'); }); }}><AppText style={styles.link}>Enable phone notifications</AppText></Pressable>
    {message && <AppText accessibilityLiveRegion="polite" style={styles.body}>{message}</AppText>}
    {busy && <AppText accessibilityLiveRegion="polite" style={styles.body}>Updating…</AppText>}
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(() => auth.logout()); }}><AppText style={styles.link}>Log out</AppText></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { paddingVertical: 20, gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.divider }, title: { fontFamily: fonts.semibold, fontSize: 20 }, body: { color: colors.body, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, choice: { flex: 1, color: colors.body }, button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blue, borderRadius: 24 }, buttonText: { color: colors.onBlue, fontFamily: fonts.semibold },
  secondary: { minHeight: 44, justifyContent: 'center' }, link: { color: colors.blue },
});
