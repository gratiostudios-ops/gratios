import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
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
import { AppDataProvider } from './src/data/AppData';
import { NavigationSheet, BottomNavigation, type Destination } from './src/components/Navigation';
import { TabPager } from './src/components/TabPager';
import { AppText } from './src/components/UI';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { MarketplaceProvider } from './src/data/Marketplace';
import { colors, fonts } from './src/theme';
import { AuthProvider, useAuth } from './src/auth/Auth';
import { AuthScreen } from './src/auth/AuthScreen';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<Destination[]>(['home']);
  const tab = history[history.length - 1];
  const navigate = useCallback((destination: Destination) => {
    setHistory(previous => previous[previous.length - 1] === destination ? previous : [...previous, destination]);
  }, []);
  const [contact, setContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.length <= 1) return false;
      Keyboard.dismiss();
      setHistory(previous => previous.length > 1 ? previous.slice(0, -1) : previous);
      return true;
    });
    return () => subscription.remove();
  }, [history.length]);
  useEffect(() => { Keyboard.dismiss(); }, [tab]);
  const menuActions = {
    onOpenMenu: () => { Keyboard.dismiss(); setMenuOpen(true); },
  };
  return <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <StatusBar hidden={false} style="light" />
    <View style={styles.content}>
    <TabPager active={tab}>
      <HomeScreen {...menuActions} isActive={tab === 'home'} onNewCard={() => navigate('home')} />
      <MarketplaceScreen isActive={tab === 'marketplace'} onContact={() => setContact(true)} />
      <ProfileScreen {...menuActions} />
    </TabPager>
    </View>
    {tab !== 'profile' && <View pointerEvents="none" style={styles.statusBarFade}>
      <View style={{ height: insets.top, backgroundColor: '#000000' }} />
      <LinearGradient colors={['#000000', '#00000000']} style={{ height: 10 }} />
    </View>}
    {!keyboardVisible && <BottomNavigation active={tab} onSelect={navigate} />}
    <NavigationSheet visible={menuOpen} active={tab} onClose={() => setMenuOpen(false)} onSelect={navigate} onContact={() => setContact(true)} />
    <Modal visible={contact} transparent animationType="fade" onRequestClose={() => setContact(false)}>
      <View style={styles.scrim}><View style={styles.contactCard}>
        <AppText accessibilityRole="header" style={styles.contactTitle}>Contact us</AppText>
        <AppText style={styles.contactBody}>Avocado is running on your local machine. For connection problems, check the Gateway terminal and the local setup guide.</AppText>
        <Pressable accessibilityRole="button" onPress={() => setContact(false)} style={styles.close}><AppText style={styles.closeText}>Got it</AppText></Pressable>
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}

function AuthenticatedApp() {
  const auth = useAuth();
  if (!auth.ready) return <View style={styles.loading}><AppText>Restoring your session…</AppText></View>;
  if (!auth.signedIn) return <AuthScreen />;
  return <AppDataProvider key={auth.identity}><MarketplaceProvider><Shell /></MarketplaceProvider></AppDataProvider>;
}

export default function App() {
  const [loaded, fontError] = useFonts({
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
    CrimsonPro_600SemiBold, CrimsonPro_700Bold,
    Poppins_400Regular, Poppins_600SemiBold, Inter_400Regular, Inter_900Black,
  });
  const onReady = useCallback(() => {
    if (loaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, fontError]);
  useEffect(() => {
    if (fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontError]);
  if (!loaded) return <View style={styles.loading} onLayout={onReady}>
    <StatusBar hidden={false} style="light" />
    <Image source={require('./assets/brand/logo.png')} resizeMode="contain" style={styles.launchLogo} accessibilityLabel="Avocado" />
    {fontError && <Text style={{ color: colors.text, padding: 32 }}>Could not load the app fonts. Please restart Avocado.</Text>}
  </View>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.safeArea} onLayout={onReady}>
    <AuthProvider><AuthenticatedApp /></AuthProvider>
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  launchLogo: { width: 240, height: 240 },
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
});
