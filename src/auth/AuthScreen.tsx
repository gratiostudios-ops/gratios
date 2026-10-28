import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/UI';
import { colors, fonts } from '../theme';
import { useAuth } from './Auth';
import { googleSignIn } from './google';

export function AuthScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const active = useRef(true);
  const pending = useRef(false);
  const [gmailAccess, setGmailAccess] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const connect = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      const session = await googleSignIn(gmailAccess);
      if (!active.current) return;
      if (session) await auth.accept(session);
      else setMessage('Choose a Google account to continue.');
    } catch (error) {
      if (active.current) setMessage(error instanceof Error ? error.message : 'Could not connect to Google. Please try again.');
    } finally { pending.current = false; if (active.current) setBusy(false); }
  };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  return <View style={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
    <Image source={require('../../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Avocado" />
    {busy ? <><ActivityIndicator color={colors.blue} /><AppText style={styles.body}>Connecting to Google…</AppText></> : <>
      <AppText accessibilityLiveRegion="polite" style={styles.body}>{message ?? auth.restoringError ?? 'Continue with your Google account.'}</AppText>
      <View style={styles.gmailChoice}><View style={{ flex: 1, gap: 4 }}><AppText style={styles.gmailTitle}>Gmail access</AppText><AppText style={styles.gmailBody}>Let your agents read and summarise emails. You can turn this off anytime.</AppText></View><Switch accessibilityLabel="Allow read-only Gmail access" value={gmailAccess} onValueChange={setGmailAccess} /></View>
      <Pressable accessibilityRole="button" onPress={() => { void connect(); }} style={styles.button}><AppText style={styles.buttonText}>Continue with Google</AppText></Pressable>
      {auth.restoringError && <Pressable accessibilityRole="button" onPress={auth.retryRestore} style={styles.retry}><AppText style={styles.retryText}>Retry connection</AppText></Pressable>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 22, backgroundColor: '#000000' },
  gmailChoice: { flexDirection: 'row', alignItems: 'center', gap: 16, maxWidth: 340 }, gmailTitle: { fontFamily: fonts.semibold }, gmailBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  logo: { width: 180, height: 180 }, body: { color: colors.body, textAlign: 'center', lineHeight: 23 },
  button: { minHeight: 52, width: '100%', maxWidth: 340, borderRadius: 26, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  buttonText: { color: '#202124', fontFamily: fonts.semibold }, retry: { minHeight: 44, justifyContent: 'center' }, retryText: { color: colors.blue },
});
