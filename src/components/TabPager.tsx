import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Destination } from './Navigation';

const tabs: Destination[] = ['home', 'profile'];

export function TabPager({ active, children }: {
  active: Destination; children: React.ReactNode;
}) {
  return <View style={styles.viewport}>
    {React.Children.map(children, (child, index) => <View
      testID={`tab-page-${tabs[index]}`}
      pointerEvents={active === tabs[index] ? 'auto' : 'none'}
      accessibilityElementsHidden={active !== tabs[index]}
      importantForAccessibility={active === tabs[index] ? 'auto' : 'no-hide-descendants'}
      style={[styles.page, active === tabs[index] ? styles.visible : styles.hidden]}
    >{child}</View>)}
  </View>;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: 0, overflow: 'hidden' },
  // Keep pages measured and mounted so switching tabs preserves canvas/scroll state.
  page: { ...StyleSheet.absoluteFill, flex: 1, overflow: 'hidden' },
  visible: { opacity: 1, zIndex: 1 },
  hidden: { opacity: 0, zIndex: 0 },
});
