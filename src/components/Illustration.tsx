import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeImage } from './SafeImage';
import type { ImageReference } from '../data/types';

// Keep the supplied illustrations fully visible.
export function Illustration({ image, width, height }: { image: ImageReference; width: number; height: number }) {
  return <View style={{ width, height, overflow: 'hidden' }}>
    <SafeImage image={image} allowAvatar={false} accessibilityIgnoresInvertColors resizeMode="contain" style={[
      StyleSheet.absoluteFill, { width: '100%', height: '100%' },
    ]} />
  </View>;
}
