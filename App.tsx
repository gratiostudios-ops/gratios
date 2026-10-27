import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
import { NavigationSheet, type Destination } from './src/components/Navigation';
import { TabPager } from './src/components/TabPager';
import { AppText } from './src/components/UI';
import { HomeScreen } from './src/screens/HomeScreen';
import { SuggestionsScreen } from './src/screens/SuggestionsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, fonts } from './src/theme';

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Destination>('home');
  const [contact, setContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { error, dismissError } = useAppData();
  useEffect(() => { Keyboard.dismiss(); }, [tab]);
  const menuActions = {
    onOpenMenu: () => { Keyboard.dismiss(); setMenuOpen(true); },
  };
  return <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <StatusBar hidden={false} style="light" />
    <View style={styles.content}>
    <TabPager active={tab}>
      <HomeScreen {...menuActions} />
      <SuggestionsScreen {...menuActions} />
      <ProfileScreen {...menuActions} />
    </TabPager>
    </View>
    <View pointerEvents="none" style={styles.statusBarFade}>
      <View style={{ height: insets.top, backgroundColor: '#000000' }} />
      <LinearGradient colors={['#000000', '#00000000']} style={{ height: 10 }} />
    </View>
    <NavigationSheet visible={menuOpen} active={tab} onClose={() => setMenuOpen(false)} onSelect={setTab} onContact={() => setContact(true)} />
    {error && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={dismissError} style={styles.error}><AppText>{error} ×</AppText></Pressable>}
    <Modal visible={contact} transparent animationType="fade" onRequestClose={() => setContact(false)}>
      <View style={styles.scrim}><View style={styles.contactCard}>
        <AppText accessibilityRole="header" style={styles.contactTitle}>Contact us</AppText>
        <AppText style={styles.contactBody}>You’re exploring the Fuse demo. Contact details will be available when your account is connected.</AppText>
        <Pressable accessibilityRole="button" onPress={() => setContact(false)} style={styles.close}><AppText style={styles.closeText}>Got it</AppText></Pressable>
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
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
  statusBarFade: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  scrim: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 28 },
  contactCard: { width: '100%', maxWidth: 360, padding: 26, backgroundColor: colors.surface, borderRadius: 18, gap: 18 },
  contactTitle: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29 },
  contactBody: { color: colors.body, lineHeight: 21 },
  close: { minHeight: 40, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, color: colors.onBlue },
  error: { position: 'absolute', top: 44, left: 22, right: 22, padding: 16, borderRadius: 12, backgroundColor: colors.task },
});
