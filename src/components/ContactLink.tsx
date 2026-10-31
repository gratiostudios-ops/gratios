import { HapticPressable as Pressable } from './HapticControls';
import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { AppText } from './UI';

export function ContactLink({ onPress }: { onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Contact us" onPress={onPress} hitSlop={10} style={styles.button}>
    <AppText style={styles.text}>Contact us</AppText>
  </Pressable>;
}

/** Render inside each native window so editors and modal screens retain the control. */
export function FixedContact({ onPress }: { onPress?(): void } = {}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  return <>
    <View pointerEvents="box-none" style={[styles.fixed, { top: insets.top + 8 }]}>
      <ContactLink onPress={onPress ?? (() => setVisible(true))} />
    </View>
    {!onPress && <ContactDialog visible={visible} onClose={() => setVisible(false)} />}
  </>;
}

export function ContactDialog({ visible, onClose }: { visible: boolean; onClose(): void }) {
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.scrim}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss contact information" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.card}>
        <AppText accessibilityRole="header" style={styles.title}>Contact us</AppText>
        <AppText style={styles.body}>Avocado is running on your local machine. For connection problems, check the Gateway terminal and the local setup guide.</AppText>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><AppText style={styles.closeText}>Got it</AppText></Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  fixed: { position: 'absolute', right: 24, zIndex: 1000, elevation: 32 },
  button: { alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#000000' },
  text: { color: '#A6A6A6', fontSize: 12, lineHeight: 16, textDecorationLine: 'underline' },
  scrim: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, padding: 24, backgroundColor: colors.surface, borderRadius: 20, gap: 16 },
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30 },
  body: { color: colors.body, fontSize: 14, lineHeight: 21 },
  close: { minHeight: 44, borderRadius: 22, backgroundColor: colors.blue, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, color: colors.onBlue },
});
