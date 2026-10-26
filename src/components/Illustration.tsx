import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { imageSource } from '../assets';
import type { ImageReference } from '../data/types';

// Figma applies this crop to the square suitcase source. Other illustrations use cover.
export function Illustration({ image, width, height }: { image: ImageReference; width: number; height: number }) {
  return <View style={{ width, height, overflow: 'hidden' }}>
    <Image source={imageSource(image)} accessibilityIgnoresInvertColors resizeMode={image.asset === 'mail' ? 'contain' : 'cover'} style={[
      StyleSheet.absoluteFill, { width: '100%', height: '100%' },
      image.asset === 'flight' && { width: '146.99%', height: '154.08%', left: '-23.5%', top: '-24.64%' },
    ]} />
  </View>;
}
