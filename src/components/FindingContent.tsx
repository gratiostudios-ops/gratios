import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Finding } from '../data/types';
import { AppText, ActionChip } from './UI';
import { Content } from './Content';
import { SafeImage } from './SafeImage';
import { colors, fonts } from '../theme';

/** Shared full-card presentation for Home and the separate detail screen. */
export function FindingContent({finding,onAction}:{finding:Finding;onAction:(message:string)=>void}){
  return <View accessibilityLabel={finding.title}>
    <AppText accessibilityRole="header" style={styles.title}>{finding.title}</AppText>
    <View style={styles.artwork}><SafeImage image={finding.image} allowAvatar={false} resizeMode="contain" accessibilityLabel={finding.title+' image'} style={styles.image}/></View>
    <View style={styles.body}><Content blocks={finding.blocks} onAction={onAction}/></View>
    {finding.suggestions.length>0&&<View style={styles.actions}>{finding.suggestions.map(action=><ActionChip key={action.id} action={action} onPress={onAction}/>)}</View>}
  </View>;
}
const styles=StyleSheet.create({
  title:{fontFamily:fonts.semibold,fontSize:20,lineHeight:26,color:colors.text,marginBottom:12},
  artwork:{height:160,borderRadius:18,backgroundColor:'#191919',overflow:'hidden',alignItems:'center',justifyContent:'center'},
  image:{width:'100%',height:'100%'},
  body:{marginTop:20},
  actions:{marginTop:16,gap:8,alignItems:'flex-start'},
});
