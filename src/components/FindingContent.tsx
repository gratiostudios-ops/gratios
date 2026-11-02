import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Finding } from '../data/types';
import { AppText, ActionChip } from './UI';
import { Content } from './Content';
import { AgentPill } from './AgentPill';
import { useAppData } from '../data/AppData';
import { colors, fonts } from '../theme';

/** Shared full-card presentation for Home and the separate detail screen. */
export function FindingContent({finding,onAction,showActions=true}:{finding:Finding;onAction:(message:string)=>void;showActions?:boolean}){
  const {agents}=useAppData();
  return <View accessibilityLabel={finding.title}>
    <AppText accessibilityRole="header" style={styles.title}>{finding.title}</AppText>
    <View style={styles.body}><Content blocks={showActions?finding.blocks:finding.blocks.filter(block=>block.type!=='actions')} onAction={onAction}/></View>
    <View style={{marginTop:16}}><AgentPill name={agents.find(agent=>agent.id===finding.agentId)?.name}/></View>
    {showActions&&finding.suggestions.length>0&&<View style={styles.actions}>{finding.suggestions.map(action=><ActionChip key={action.id} action={action} onPress={onAction}/>)}</View>}
  </View>;
}
const styles=StyleSheet.create({
  title:{fontFamily:fonts.semibold,fontSize:20,lineHeight:26,color:colors.text,marginBottom:12},
  body:{marginTop:4},
  actions:{marginTop:16,gap:8,alignItems:'flex-start'},
});
