import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { marketIcons } from '../data/local-marketplace';
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
  return <View style={styles.screen}>
    <LinearGradient pointerEvents="none" colors={['#000000', '#00000000']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topFade} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={styles.brand}><Image source={require('../../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Avocado" /><AppText style={styles.brandName}>Avocado</AppText></View>
        <View style={styles.hero}>
          <Image source={marketIcons.store} resizeMode="contain" style={styles.store} />
          <Image source={marketIcons.search} resizeMode="contain" style={styles.search} />
          <Image source={marketIcons.bag} resizeMode="contain" style={styles.bag} />
          <AppText accessibilityRole="header" style={styles.title}>A little help.{'\n'}A better everyday.</AppText>
          <AppText style={styles.subtitle}>Personal agents for your inbox, plans, and everything in between.</AppText>
        </View>
        <View style={styles.features}>
          <AppText style={styles.section}>Made for you</AppText>
          <AppText style={styles.featureTitle}>Your day, brought together</AppText>
          <AppText style={styles.body}>Catch up on email, keep your plans close, and discover agents that fit your life.</AppText>
        </View>
        <View style={styles.gmailChoice}><View style={{ flex: 1, gap: 4 }}><AppText style={styles.gmailTitle}>Connect Gmail</AppText><AppText style={styles.gmailBody}>Read-only access for email summaries. You can change this anytime.</AppText></View><Switch accessibilityLabel="Allow read-only Gmail access" disabled={busy} value={gmailAccess} onValueChange={setGmailAccess} trackColor={{ false: '#393939', true: '#2468f5' }} /></View>
        {(message || auth.restoringError) && <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{message ?? auth.restoringError}</AppText>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => { void connect(); }} style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <AppText style={styles.buttonText}>Continue with Google</AppText>}
        </Pressable>
        {busy && <AppText accessibilityLiveRegion="polite" style={styles.gmailBody}>Connecting to Google…</AppText>}
        {auth.restoringError && !busy && <Pressable accessibilityRole="button" onPress={auth.retryRestore} style={styles.retry}><AppText style={styles.retryText}>Retry connection</AppText></Pressable>}
        <AppText style={styles.footnote}>Your connected accounts and conversations stay private.</AppText>
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 252 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  logo: { width: 40, height: 40 }, brandName: { fontFamily: fonts.bold, fontSize: 20, color: '#f2f2f2' },
  hero: { alignItems: 'center', paddingTop: 72, paddingBottom: 20, position: 'relative' },
  store: { position: 'absolute', top: 0, left: '10%', width: 65, height: 65, transform: [{ rotate: '-10deg' }] },
  search: { position: 'absolute', top: 10, right: '12%', width: 54, height: 54, transform: [{ rotate: '12deg' }] },
  bag: { position: 'absolute', right: 0, bottom: 4, width: 40, height: 48, transform: [{ rotate: '10deg' }] },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, textAlign: 'center', color: '#f2f2f2' },
  subtitle: { marginTop: 12, paddingHorizontal: 16, fontFamily: fonts.medium, color: '#929292', textAlign: 'center', fontSize: 16, lineHeight: 22 },
  features: { padding: 18, borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#1b1b1b', gap: 6 },
  section: { color: '#558dff', fontFamily: fonts.semibold, fontSize: 12 },
  featureTitle: { color: '#dedede', fontFamily: fonts.semibold, fontSize: 17 },
  body: { color: '#929292', fontSize: 14, lineHeight: 20 },
  gmailChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: '#171717' },
  gmailTitle: { fontFamily: fonts.semibold, fontSize: 14, color: '#dedede' }, gmailBody: { color: '#858585', fontSize: 12, lineHeight: 17 },
  feedback: { color: '#d2a1a1', fontSize: 13, lineHeight: 18 },
  button: { minHeight: 50, width: '100%', borderRadius: 25, backgroundColor: '#2468f5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 4 },
  buttonText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 14 },
  footnote: { color: '#6d6d6d', textAlign: 'center', fontSize: 11, lineHeight: 16, paddingHorizontal: 20 },
  retry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, retryText: { color: '#558dff', fontSize: 13 },
});
