import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { gateway, useAuth } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';

type Configuration = { agents: { key: string }[]; permissions: { toolName: string; granted: boolean }[] };
type GmailStatus = { connected: boolean; status: string; accountEmail: string | null };
export function AccountSettings() {
  const { refresh, isDemo, profile } = useAppData();
  const auth = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [read, setRead] = useState(false);
  const [search, setSearch] = useState(false);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [dob, setDob] = useState(profile.dob);
  const [interests, setInterests] = useState(profile.interests.join(', '));
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const load = async () => {
      try {
        const config = await gateway.request<Configuration>('/gateway/config');
        if (!active) return;
        setEnabled(config.agents.some(agent => agent.key === 'email-summariser'));
        setRead(config.permissions.some(permission => permission.toolName === 'gmail_read' && permission.granted));
        setSearch(config.permissions.some(permission => permission.toolName === 'gmail_search' && permission.granted));
        setLoaded(true);
        const status = await gateway.request<GmailStatus>('/integrations/gmail');
        if (active) setGmail(status);
      } catch (error) { if (active) setMessage(error instanceof Error ? error.message : 'Could not load connection settings.'); }
    };
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active = false; subscription.remove(); };
  }, [isDemo, attempt]);
  if (isDemo) return null;
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update your account.'); }
    finally { setBusy(false); }
  };
  const statusText = !gmail ? 'Connection status unavailable' : gmail.connected ? 'Connected: ' + gmail.accountEmail : gmail.status === 'reconnect_required' ? 'Gmail needs to be reconnected' : 'Gmail is disconnected';
  return <View style={styles.card}>
    <AppText accessibilityRole="header" style={styles.title}>Gmail assistant</AppText>
    <AppText style={styles.body}>{statusText}</AppText>
    {!loaded && <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={styles.secondary}><AppText style={styles.link}>Retry loading settings</AppText></Pressable>}
    <AppText style={styles.body}>Enable the agent and choose its permissions. Connecting Google is a separate read-only consent step.</AppText>
    <View style={styles.row}><AppText style={styles.choice}>Enable Email Summariser</AppText><Switch accessibilityLabel="Enable Email Summariser" value={enabled} onValueChange={setEnabled} disabled={busy || !loaded} /></View>
    <View style={styles.row}><AppText style={styles.choice}>Read inbox messages</AppText><Switch accessibilityLabel="Allow reading Gmail" value={read} onValueChange={setRead} disabled={busy || !loaded} /></View>
    <View style={styles.row}><AppText style={styles.choice}>Search inbox messages</AppText><Switch accessibilityLabel="Allow searching Gmail" value={search} onValueChange={setSearch} disabled={busy || !loaded} /></View>
    <Pressable accessibilityRole="button" disabled={busy || !loaded} style={styles.button} onPress={() => { void run(async () => {
      await gateway.request('/gateway/onboarding', { method: 'POST', body: JSON.stringify({ enabled, grants: { gmail_read: read, gmail_search: search } }) });
      await refresh(); setMessage('Agent permissions saved.');
    }); }}><AppText style={styles.buttonText}>Save agent permissions</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void run(async () => {
      const result = await gateway.request<{ authorizationUrl: string }>('/integrations/gmail/connect', { method: 'POST', body: '{}' });
      if (!result.authorizationUrl.startsWith('https://accounts.google.com/')) throw new Error('Invalid Google authorization URL.');
      await Linking.openURL(result.authorizationUrl); setMessage('Finish Google consent in your browser, then return to Avocado.');
    }); }}><AppText style={styles.buttonText}>{gmail?.connected || gmail?.status === 'reconnect_required' ? 'Reconnect Gmail' : 'Connect Gmail'}</AppText></Pressable>
    {gmail?.status !== 'disconnected' && gmail && <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => {
      const result = await gateway.request<{ providerRevoked: boolean }>('/integrations/gmail', { method: 'DELETE' });
      setGmail({ connected: false, status: 'disconnected', accountEmail: null }); await refresh();
      setMessage(result.providerRevoked ? 'Gmail disconnected.' : 'Disconnected locally. Also remove Avocado in your Google Account connected-app settings.');
    }); }}><AppText style={styles.link}>Disconnect Gmail</AppText></Pressable>}
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => {
      const status = await gateway.request<GmailStatus>('/integrations/gmail'); setGmail(status); await refresh(); setMessage('Connection status refreshed.');
    }); }}><AppText style={styles.link}>Refresh connection</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { setName(profile.name); setDob(profile.dob); setInterests(profile.interests.join(', ')); setEditing(value => !value); }}><AppText style={styles.link}>Edit profile</AppText></Pressable>
    {editing && <View style={{ gap: 12 }}>
      <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput accessibilityLabel="Date of birth" value={dob} onChangeText={setDob} placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput accessibilityLabel="Interests" value={interests} onChangeText={setInterests} placeholder="Interests, separated by commas" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void run(async () => {
        await gateway.request('/gateway/profile', { method: 'PUT', body: JSON.stringify({ displayName: name.trim(), dob: dob.trim(), interests: interests.split(',').map(value => value.trim()).filter(Boolean) }) });
        await refresh(); setEditing(false); setMessage('Profile saved.');
      }); }}><AppText style={styles.buttonText}>Save profile</AppText></Pressable>
    </View>}
    {message && <AppText accessibilityLiveRegion="polite" style={styles.body}>{message}</AppText>}
    {busy && <AppText accessibilityLiveRegion="polite" style={styles.body}>Updating…</AppText>}
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(() => auth.logout()); }}><AppText style={styles.link}>Log out</AppText></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { paddingVertical: 20, gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.divider }, title: { fontFamily: fonts.semibold, fontSize: 20 }, body: { color: colors.body, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, choice: { flex: 1, color: colors.body }, button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blue, borderRadius: 24 }, buttonText: { color: colors.onBlue, fontFamily: fonts.semibold },
  secondary: { minHeight: 44, justifyContent: 'center' }, link: { color: colors.blue }, input: { minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: colors.surface, color: colors.text },
});
