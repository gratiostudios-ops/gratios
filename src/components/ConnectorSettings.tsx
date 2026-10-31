import { HapticPressable as Pressable } from './HapticControls';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, StyleSheet, View } from 'react-native';
import { gateway } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { AppText } from './UI';
import { fonts } from '../theme';

type Status = { connected: boolean; tasksConnected?: boolean; accountEmail?: string | null };
const connectors = [
  { id: 'calendar', name: 'Google Calendar', image: require('../../assets/connectors/calendar.png') },
  { id: 'gmail', name: 'Gmail', image: require('../../assets/connectors/gmail.png') },
] as const;

export function ConnectorSettings() {
  const { isDemo, refresh } = useAppData();
  const [statuses, setStatuses] = useState<Partial<Record<'calendar' | 'gmail', Status>>>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = async () => {
    const results = await Promise.allSettled(connectors.map(async connector => [connector.id, await gateway.request<Status>('/integrations/' + connector.id)] as const));
    setStatuses(Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(result => result.value)));
    if (results.some(result => result.status === 'rejected')) setMessage('Could not load connection status. Tap Retry.');
  };
  useEffect(() => {
    if (isDemo) return;
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => subscription.remove();
  }, [isDemo]);
  const update = async (id: 'calendar' | 'gmail', enabled: boolean) => {
    if (lock.current || isDemo) return;
    lock.current = true; setBusy(true); setMessage(null);
    try {
      if (enabled) {
        const result = await gateway.request<{ authorizationUrl: string }>('/integrations/' + id + '/connect', { method: 'POST', body: '{}' });
        if (new URL(result.authorizationUrl).origin !== 'https://accounts.google.com') throw new Error('Invalid Google authorization URL.');
        await Linking.openURL(result.authorizationUrl);
      } else {
        await gateway.request('/integrations/' + id, { method: 'DELETE' });
        await load(); await refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update connection.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View>
    {connectors.map((connector, index) => <View key={connector.id} style={[styles.row, index === 0 && styles.divider]}>
      <Image source={connector.image} style={styles.icon} resizeMode="contain" />
      <View style={styles.label}><AppText style={styles.name}>{connector.name}</AppText>
        {connector.id === 'calendar' && statuses.calendar?.connected && !statuses.calendar.tasksConnected && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void update('calendar', true); }}><AppText style={styles.link}>Reconnect to enable Tasks</AppText></Pressable>}
      </View>
      <Pressable accessibilityRole="switch" accessibilityLabel={`Connect ${connector.name}`} accessibilityState={{ checked: statuses[connector.id]?.connected ?? false, disabled: busy || isDemo || !statuses[connector.id] }} disabled={busy || isDemo || !statuses[connector.id]} onPress={() => { void update(connector.id, !statuses[connector.id]?.connected); }} hitSlop={6} style={[styles.switchTrack, statuses[connector.id]?.connected && styles.switchOn, (busy || isDemo || !statuses[connector.id]) && { opacity: 0.45 }]}>
        <View style={[styles.switchThumb, statuses[connector.id]?.connected && { transform: [{ translateX: 20 }] }]} />
      </Pressable>
    </View>)}
    {message && <View style={styles.feedback}><AppText accessibilityLiveRegion="polite" style={styles.name}>{message}</AppText><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMessage(null); void load(); }}><AppText style={styles.link}>Retry</AppText></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({
  switchTrack: { width: 51, height: 31, flexShrink: 0, borderRadius: 16, padding: 2, backgroundColor: '#39393d' },
  switchOn: { backgroundColor: '#34c759' },
  switchThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#ffffff' },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#39393b' }, icon: { width: 30, height: 30 }, label: { flex: 1, minWidth: 0 },
  name: { color: '#ffffff', fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 }, link: { color: '#2468f5', fontFamily: fonts.regular, fontSize: 13, paddingVertical: 8 }, feedback: { marginTop: 12 },
});
