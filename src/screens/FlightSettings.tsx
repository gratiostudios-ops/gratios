import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { gateway } from '../auth/Auth';
import { useAppData } from '../data/AppData';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';

type Watch = { configured: boolean; enabled: boolean; departureMonth: string; targetPrice: number | null;
  latest: null | { checkedAt: string; minPrice: number | null; change: number | null; belowTarget: boolean } };

export function FlightSettings() {
  const { isDemo, refresh } = useAppData();
  const [watch, setWatch] = useState<Watch | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [month, setMonth] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const load = async () => {
      try {
        const result = await gateway.request<Watch>('/gateway/flights/watch');
        if (active) { setWatch(result); setEnabled(result.enabled); setMonth(result.departureMonth); setTarget(result.targetPrice === null ? '' : String(result.targetPrice)); setMessage(null); }
      } catch (error) { if (active) setMessage(error instanceof Error ? error.message : 'Could not load flight tracker.'); }
    };
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active = false; subscription.remove(); };
  }, [isDemo]);
  if (isDemo) return null;
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Flight tracker request failed.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.card}>
    <AppText accessibilityRole="header" style={styles.title}>Kochi → Dubai prices</AppText>
    <AppText style={styles.body}>One-way COK → DXB fares in INR. Checks at 9 AM and 9 PM India time while your backend is running, until the departure month ends. Prices are cached estimates.</AppText>
    {watch && !watch.configured && <AppText style={styles.body}>Flight price connection is not configured yet.</AppText>}
    <View style={styles.row}><AppText style={styles.body}>Enable price tracker</AppText><Switch accessibilityLabel="Enable COK to DXB price tracker" value={enabled} onValueChange={setEnabled} disabled={busy || !watch} /></View>
    <TextInput accessibilityLabel="Departure month" value={month} onChangeText={setMonth} placeholder="Departure month (YYYY-MM)" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={7} style={styles.input} editable={!busy} />
    <TextInput accessibilityLabel="Target price in INR" value={target} onChangeText={setTarget} placeholder="Target price in INR (optional)" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={9} style={styles.input} editable={!busy} />
    <Pressable accessibilityRole="button" disabled={busy || !watch} style={styles.button} onPress={() => { void run(async () => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim())) throw new Error('Enter the departure month as YYYY-MM.');
      if (target.trim() && !/^[1-9]\d*$/.test(target.trim())) throw new Error('Enter a positive whole-number target price.');
      const saved = await gateway.request<Watch>('/gateway/flights/watch', { method: 'PUT', body: JSON.stringify({ enabled, departureMonth: month.trim(), targetPrice: target.trim() ? Number(target) : null }) });
      setWatch(saved);
      if (saved.enabled) { await gateway.request('/gateway/flights/check', { method: 'POST', body: '{}' }); setMessage('Tracking enabled. First check queued; results will appear on Home.'); }
      else setMessage('Price tracking stopped.');
      await refresh();
    }); }}><AppText style={styles.buttonText}>Save price tracker</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy || !watch?.enabled} style={styles.secondary} onPress={() => { void run(async () => {
      await gateway.request('/gateway/flights/check', { method: 'POST', body: '{}' }); setMessage('Price check queued. Ask about COK to DXB fares on Home, or refresh results shortly.');
    }); }}><AppText style={styles.link}>Check prices now</AppText></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { void run(async () => {
      const result = await gateway.request<Watch>('/gateway/flights/watch'); setWatch(result); await refresh(); setMessage(result.latest ? 'Results refreshed.' : 'No completed price check yet.');
    }); }}><AppText style={styles.link}>Refresh price results</AppText></Pressable>
    {watch?.latest && <AppText style={styles.body}>{watch.latest.minPrice === null ? 'No cached fares found for this month.' : `Lowest recorded fare: ₹${watch.latest.minPrice.toLocaleString('en-IN')}${watch.latest.change === null ? '' : ` (${watch.latest.change > 0 ? '+' : ''}₹${watch.latest.change.toLocaleString('en-IN')} versus the previous month minimum)`}${watch.latest.belowTarget ? '. Within your target price.' : ''}`}{'\n'}Checked: {new Date(watch.latest.checkedAt).toLocaleString()}</AppText>}
    {message && <AppText accessibilityLiveRegion="polite" style={styles.body}>{message}</AppText>}
    {busy && <AppText style={styles.body}>Updating…</AppText>}
  </View>;
}
const styles = StyleSheet.create({
  card: { paddingVertical: 20, gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontFamily: fonts.semibold, fontSize: 20 }, body: { color: colors.body, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: colors.surface, color: colors.text },
  button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blue, borderRadius: 24 },
  buttonText: { color: colors.onBlue, fontFamily: fonts.semibold }, secondary: { minHeight: 44, justifyContent: 'center' }, link: { color: colors.blue },
});
