import { HapticPressable as Pressable } from './HapticControls';
import React from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from './UI';

export function ContactLink({ onPress }: { onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Contact us" onPress={onPress} style={styles.button}>
    <AppText style={styles.text}>Contact us</AppText>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  text: { color: '#6D6D6D', fontSize: 12, textDecorationLine: 'underline' },
});
