import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { agentStickers, type StickerKey } from '../agent-icons';
import type { MarketplaceArtwork } from '../data/marketplace';
import { HapticPressable } from './HapticControls';
import { MarketArt, ui } from './MarketplaceUI';
import { PhosphorIcon } from './PhosphorIcon';
import { AppText } from './UI';
import { MediaPicker } from './MediaPicker';

export function AgentIconPicker({ value, onChange, disabled = false, onBusyChange }: { value: MarketplaceArtwork; onChange(value: MarketplaceArtwork): void; disabled?: boolean; onBusyChange?(busy: boolean): void }) {
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><MarketArt image={value} size={48} /><AppText style={ui.body}>{value.mediaId ? 'Uploaded icon' : 'Choose an icon or upload your own.'}</AppText></View>
    <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 4 }}>
      {(Object.keys(agentStickers) as StickerKey[]).map(key => <View key={key} style={{ width: '25%', padding: 4 }}>
        <HapticPressable accessibilityRole="radio" accessibilityLabel={agentStickers[key].label + ' icon'} accessibilityState={{ checked: value.asset === key, disabled }} disabled={disabled} onPress={() => onChange({ asset: key })} style={({ pressed }) => ({ width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: value.asset === key ? '#2468f5' : '#303030', backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Image source={agentStickers[key].source} resizeMode="contain" style={{ width: '76%', height: '76%' }} />
          {value.asset === key && <View style={{ position: 'absolute', right: 3, top: 3, borderRadius: 9, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2468f5' }}><PhosphorIcon name="check" size={12} color="#fff" /></View>}
        </HapticPressable>
      </View>)}
    </ScrollView>
    <MediaPicker kind="icon" value={value.mediaId ? value : null} onChange={onChange} disabled={disabled} onBusyChange={onBusyChange} />
  </View>;
}
