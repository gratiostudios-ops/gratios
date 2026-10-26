import React from 'react';
import { StyleSheet, View } from 'react-native';
import Home from '../../assets/figma/a50fe.svg';
import Lightbulb from '../../assets/figma/03051.svg';
import Profile from '../../assets/figma/bb5a4.svg';
import Mail from '../../assets/figma/b0fc9.svg';
import PlaneInner from '../../assets/figma/019d9.svg';
import PlaneOuter from '../../assets/figma/94bae.svg';
import Gym from '../../assets/figma/cecd7.svg';
import Video from '../../assets/figma/2df68.svg';
import Arrow from '../../assets/figma/6e3a8.svg';
import News from '../../assets/news.svg';
import type { AgentIcon } from '../data/types';

export type IconName = AgentIcon | 'home' | 'suggestions' | 'profile' | 'send';
export function Icon({ name, color = '#ffffff' }: { name: IconName; color?: string }) {
  if (name === 'flight') return <View style={styles.plane}>
    <View style={styles.planeInner}><PlaneInner color={color} /></View>
    <PlaneOuter color={color} />
  </View>;
  const Component = { home: Home, suggestions: Lightbulb, profile: Profile, mail: Mail, gym: Gym, video: Video, news: News, send: Arrow }[name];
  return <Component color={color} />;
}
const styles = StyleSheet.create({
  plane: { width: 18, height: 18 },
  planeInner: { position: 'absolute', left: 0.55, top: 0.55 },
});
