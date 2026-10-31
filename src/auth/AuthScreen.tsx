import { HapticPressable as Pressable } from '../components/HapticControls';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { marketIcons } from '../data/local-marketplace';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FixedContact } from '../components/ContactLink';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';
import { gateway, useAuth } from './Auth';
import type { Session } from '../data/api';
import { MarketDisclosure } from '../components/MarketplaceUI';
import { googleSignIn } from './google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionPicker } from '../components/ConnectionPicker';
import { PhosphorIcon } from '../components/PhosphorIcon';
import { needsCalendarConsent, type ConnectionId } from '../data/connection-options';
import { registerPhonePush } from '../notifications';

export function AuthScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const active = useRef(true);
  const pending = useRef(false);
  const [step, setStep] = useState<'welcome' | 'connections'>('welcome');
  const [selectedConnections, setSelectedConnections] = useState<ConnectionId[]>(['gmail']);
  const gmailAccess = selectedConnections.includes('gmail');
  const calendarAccess = needsCalendarConsent(selectedConnections);
  const alertsSelected = selectedConnections.includes('notifications');
  const [alertsConnected, setAlertsConnected] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLaunched, setCalendarLaunched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const finish = async (session: Session) => {
    const extra = preferences.split('\n').map(value => value.trim()).filter(Boolean);
    if (extra.some(value => value.length > 500)) throw new Error('Keep each preference under 500 characters.');
    if (extra.length) {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const current = await gateway.request<{ profile?: { preferences?: string[] } }>('/auth/me', { headers }, false);
      const combined = [...new Set([...(current.profile?.preferences ?? []), ...extra])];
      if (combined.length > 100) throw new Error('Use fewer preferences to continue.');
      await gateway.request('/gateway/profile', { method: 'PUT', headers, body: JSON.stringify({ preferences: combined }) }, false);
    }
    await AsyncStorage.setItem('avocado:connections:' + session.userId, JSON.stringify(selectedConnections));
    if (active.current) await auth.accept(session);
  };
  const checkCalendar = async (session: Session) => {
    const status = await gateway.request<{ connected: boolean; tasksConnected?: boolean }>('/integrations/calendar', { headers: { Authorization: `Bearer ${session.access_token}` } }, false);
    if (!active.current) return;
    setCalendarConnected(status.connected && !!status.tasksConnected);
    if (status.connected && !status.tasksConnected) setMessage('Calendar is connected. Reconnect and allow Tasks to enable both.');
    else if (!status.connected) setMessage('Finish Google consent, then return here to check the connection.');
    else setMessage(null);
  };
  const connectCalendar = async () => {
    if (!pendingSession || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      const result = await gateway.request<{ authorizationUrl: string }>('/integrations/calendar/connect', { method: 'POST', headers: { Authorization: `Bearer ${pendingSession.access_token}` }, body: '{}' }, false);
      if (new URL(result.authorizationUrl).origin !== 'https://accounts.google.com') throw new Error('Invalid Google authorization URL.');
      setCalendarLaunched(true);
      await Linking.openURL(result.authorizationUrl);
    } catch (error) { if (active.current) setMessage(error instanceof Error ? error.message : 'Could not connect Calendar and Tasks.'); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const connectAlerts = async () => {
    if (!pendingSession || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      const notice = await registerPhonePush(undefined, true, async (token, signal) => {
        await gateway.request('/gateway/device', { method: 'PUT', headers: { Authorization: `Bearer ${pendingSession.access_token}` }, body: JSON.stringify({ token }), signal }, false);
      });
      if (!active.current) return;
      if (notice) setMessage(notice); else setAlertsConnected(true);
    } catch (error) { if (active.current) setMessage(error instanceof Error ? error.message : 'Could not enable phone alerts.'); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const complete = async () => {
    if (!pendingSession || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try { await finish(pendingSession); }
    catch (error) { if (active.current) setMessage(error instanceof Error ? error.message : 'Could not save your preferences. Please retry.'); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const connect = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      const session = await googleSignIn(gmailAccess);
      if (!active.current) return;
      if (session) {
        setPendingSession(session);
        if (!calendarAccess && !alertsSelected) await finish(session);
      }
      else setMessage('Choose a Google account to continue.');
    } catch (error) {
      if (active.current) setMessage(error instanceof Error ? error.message : 'Could not connect to Google. Please try again.');
    } finally { pending.current = false; if (active.current) setBusy(false); }
  };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (!pendingSession || !calendarAccess) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkCalendar(pendingSession).catch(() => { if (active.current) setMessage('Could not check Calendar. Retry or connect later in Profile.'); });
    });
    return () => subscription.remove();
  }, [pendingSession, calendarAccess]);
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={styles.brand}><Image source={require('../../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Avocado" /><AppText style={styles.brandName}>Avocado</AppText></View>
        {step === 'welcome' && !pendingSession && <View style={styles.hero}>
          <Image source={marketIcons.store} resizeMode="contain" style={styles.store} />
          <Image source={marketIcons.search} resizeMode="contain" style={styles.search} />
          <Image source={marketIcons.bag} resizeMode="contain" style={styles.bag} />
          <AppText accessibilityRole="header" style={styles.title}>A little help.{'\n'}A better everyday.</AppText>
          <AppText style={styles.subtitle}>Personal agents for your inbox, plans, and everything in between.</AppText>
        </View>}
        {step === 'welcome' && !pendingSession && <View style={styles.features}>
          <AppText style={styles.section}>Made for you</AppText>
          <AppText style={styles.featureTitle}>Your day, brought together</AppText>
          <AppText style={styles.body}>Catch up on email, keep your plans close, and discover agents that fit your life.</AppText>
        </View>}
        {step === 'welcome' && !pendingSession ? <Pressable accessibilityRole="button" onPress={() => setStep('connections')} style={styles.button}><AppText style={styles.buttonText}>Get started</AppText></Pressable> : !pendingSession ? <>
          <View style={styles.stepHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" disabled={busy} onPress={() => setStep('welcome')} style={styles.backButton}><View style={{ transform: [{ rotate: '180deg' }] }}><PhosphorIcon name="arrow-right" color="#bcbcbc" /></View></Pressable>
            <AppText style={styles.section}>2 of 2</AppText>
          </View>
          <AppText accessibilityRole="header" style={styles.connectionsTitle}>Make it yours.</AppText>
          <AppText style={styles.body}>Add the connections your agents can help with.</AppText>
          <ConnectionPicker selected={selectedConnections} onChange={setSelectedConnections} disabled={busy} />
          <MarketDisclosure title="Agent preferences" summary="Optional · how would you like agents to help?">
            <AppText style={styles.gmailBody}>For example: keep replies short, highlight urgent email, or focus on workday planning. One preference per line.</AppText>
            <TextInput accessibilityLabel="Agent preferences" placeholder="How should your agents help?" placeholderTextColor="#6d6d6d" multiline textAlignVertical="top" value={preferences} onChangeText={setPreferences} editable={!busy} maxLength={2000} style={styles.preferenceInput} />
          </MarketDisclosure>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => { void connect(); }} style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <AppText style={styles.buttonText}>Continue with Google</AppText>}
          </Pressable>
          {auth.restoringError && !busy && <Pressable accessibilityRole="button" onPress={auth.retryRestore} style={styles.retry}><AppText style={styles.retryText}>Retry connection</AppText></Pressable>}
        </> : <>
          <View style={styles.features}>
            <AppText style={styles.section}>You're signed in</AppText>
            <AppText style={styles.featureTitle}>{calendarAccess ? (calendarConnected ? 'Calendar & Tasks connected' : 'Connect Calendar & Tasks') : 'Finish setting up your agents'}</AppText>
            <AppText style={styles.body}>{calendarAccess ? 'Allow Google Calendar and Tasks access to bring your plans into Home. You can also connect later in Profile.' : 'Your preferences will be saved when you continue.'}</AppText>
          </View>
          {calendarAccess && !calendarConnected && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void connectCalendar(); }} style={styles.button}><AppText style={styles.buttonText}>{calendarLaunched ? 'Reconnect Calendar & Tasks' : 'Connect Calendar & Tasks'}</AppText></Pressable>}
          {calendarAccess && calendarLaunched && !calendarConnected && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void checkCalendar(pendingSession).catch(() => setMessage('Could not check the connection. Please retry.')); }} style={styles.retry}><AppText style={styles.retryText}>Check connection</AppText></Pressable>}
          {alertsSelected && <View style={styles.features}><AppText style={styles.featureTitle}>{alertsConnected ? 'Phone alerts enabled' : 'Phone alerts'}</AppText><AppText style={styles.body}>Get updates from your agents on this device.</AppText>{!alertsConnected && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void connectAlerts(); }} style={styles.button}><AppText style={styles.buttonText}>Enable phone alerts</AppText></Pressable>}</View>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void complete(); }} style={[styles.button, calendarAccess && !calendarConnected && { backgroundColor: '#292929' }]}>{busy ? <ActivityIndicator color="#fff" /> : <AppText style={styles.buttonText}>{calendarAccess && !calendarConnected || alertsSelected && !alertsConnected ? 'Finish setup later' : 'Continue'}</AppText>}</Pressable>
        </>}
        {(message || auth.restoringError || pendingSession?.notice) && <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{message ?? auth.restoringError ?? pendingSession?.notice}</AppText>}
        <AppText style={styles.footnote}>Your connected accounts and conversations stay private.</AppText>
      </View>
    </ScrollView>
    <FixedContact />
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  connectionsTitle: { color: '#f2f2f2', fontFamily: fonts.bold, fontSize: 28, lineHeight: 36 },
  screen: { flex: 1, backgroundColor: colors.background },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  logo: { width: 40, height: 40 }, brandName: { fontFamily: fonts.bold, fontSize: 20, color: '#f2f2f2' },
  hero: { alignItems: 'center', paddingTop: 72, paddingBottom: 20, position: 'relative' },
  store: { position: 'absolute', top: 0, left: '10%', width: 65, height: 65, transform: [{ rotate: '-10deg' }] },
  search: { position: 'absolute', top: 10, right: '12%', width: 54, height: 54, transform: [{ rotate: '12deg' }] },
  bag: { position: 'absolute', right: 0, top: 28, width: 40, height: 48, transform: [{ rotate: '10deg' }] },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, textAlign: 'center', color: '#f2f2f2' },
  subtitle: { marginTop: 12, paddingHorizontal: 16, fontFamily: fonts.medium, color: '#929292', textAlign: 'center', fontSize: 16, lineHeight: 22 },
  features: { padding: 18, borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#1b1b1b', gap: 6 },
  section: { color: '#558dff', fontFamily: fonts.semibold, fontSize: 12 },
  featureTitle: { color: '#dedede', fontFamily: fonts.semibold, fontSize: 17 },
  body: { color: '#929292', fontSize: 14, lineHeight: 20 },
  gmailChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: '#171717' },
  preferenceInput: { minHeight: 90, borderRadius: 12, backgroundColor: '#242424', padding: 12, color: '#dedede', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  gmailTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: '#dedede' }, gmailBody: { color: '#858585', fontSize: 12, lineHeight: 17 },
  feedback: { color: '#d2a1a1', fontSize: 13, lineHeight: 18 },
  button: { minHeight: 50, width: '100%', borderRadius: 25, backgroundColor: '#2468f5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 4 },
  buttonText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  footnote: { color: '#6d6d6d', textAlign: 'center', fontSize: 11, lineHeight: 16, paddingHorizontal: 20 },
  retry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, retryText: { color: '#558dff', fontSize: 13 },
});
