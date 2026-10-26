import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { CrimsonPro_600SemiBold } from '@expo-google-fonts/crimson-pro/600SemiBold';
import { CrimsonPro_700Bold } from '@expo-google-fonts/crimson-pro/700Bold';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_900Black } from '@expo-google-fonts/inter/900Black';
import { AppDataProvider, useAppData } from './src/data/AppData';
import { BottomTabs, type Tab } from './src/components/BottomTabs';
import { TabPager } from './src/components/TabPager';
import { AppText } from './src/components/UI';
import { HomeScreen } from './src/screens/HomeScreen';
import { SuggestionsScreen } from './src/screens/SuggestionsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, fonts } from './src/theme';

function Shell() {
  const [tab, setTab] = useState<Tab>('home');
  const [contact, setContact] = useState(false);
  const { error, dismissError } = useAppData();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const frame = useRef({ width: 0, height: 0 });
  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  useEffect(() => { Keyboard.dismiss(); }, [tab]);
  return <View style={styles.shell} onLayout={({ nativeEvent: { layout } }) => {
    if (layout.width !== frame.current.width || layout.height > frame.current.height || (!keyboardOpen && !Keyboard.isVisible() && frame.current.height - layout.height < 80)) frame.current = layout;
  }}>
    <StatusBar hidden={false} style={tab === 'profile' ? 'dark' : 'light'} />
    <View style={[styles.content, keyboardOpen && frame.current.height > 0 && { position: 'absolute', top: 0, left: 0, right: 0, height: frame.current.height }]}>
    <TabPager active={tab}>
      <HomeScreen />
      <SuggestionsScreen />
      <ProfileScreen />
    </TabPager>
    <BottomTabs active={tab} onChange={setTab} onContact={() => setContact(true)} />
    </View>
    {error && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={dismissError} style={styles.error}><AppText>{error} ×</AppText></Pressable>}
    <Modal visible={contact} transparent animationType="fade" onRequestClose={() => setContact(false)}>
      <View style={styles.scrim}><View style={styles.contactCard}>
        <AppText accessibilityRole="header" style={styles.contactTitle}>Contact us</AppText>
        <AppText style={styles.contactBody}>You’re exploring the Fuse demo. Contact details will be available when your account is connected.</AppText>
        <Pressable accessibilityRole="button" onPress={() => setContact(false)} style={styles.close}><AppText style={styles.closeText}>Got it</AppText></Pressable>
      </View></View>
    </Modal>
  </View>;
}

export default function App() {
  const [loaded, fontError] = useFonts({
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
    CrimsonPro_600SemiBold, CrimsonPro_700Bold,
    Poppins_400Regular, Poppins_600SemiBold, Inter_400Regular, Inter_900Black,
  });
  if (!loaded) return <View style={styles.loading}><StatusBar hidden={false} style="light" />{fontError ? <Text style={{ color: colors.text, padding: 32 }}>Could not load the app fonts. Please restart Fuse.</Text> : <ActivityIndicator accessibilityLabel="Loading Fuse" color={colors.blue} />}</View>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.safeArea}>
    <AppDataProvider><Shell /></AppDataProvider>
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: colors.feedBackground },
  shell: { flex: 1, backgroundColor: colors.background, alignSelf: 'stretch', overflow: 'hidden' },
  content: { flex: 1, minHeight: 0 },
  scrim: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 28 },
  contactCard: { width: '100%', maxWidth: 360, padding: 26, backgroundColor: colors.surface, borderRadius: 18, gap: 18 },
  contactTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29 },
  contactBody: { color: colors.body, lineHeight: 21 },
  close: { minHeight: 40, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, color: '#ffffff' },
  error: { position: 'absolute', top: 44, left: 22, right: 22, padding: 16, borderRadius: 12, backgroundColor: colors.task },
});
