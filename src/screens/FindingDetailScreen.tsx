import React,{useEffect,useRef,useState} from 'react';
import { AppState, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticPressable as Pressable } from '../components/HapticControls';
import { AppText } from '../components/UI';
import { FindingContent } from '../components/FindingContent';
import { useAppData } from '../data/AppData';
import { responseMessages } from '../data/conversations';
import type { Finding } from '../data/types';
import { Composer,TypewriterReply } from './HomeScreen';
import { colors,fonts,layout } from '../theme';

/** Holds the opened card snapshot even if subsequent agent results replace it. */
export function FindingDetailScreen({finding,onBack}:{finding:Finding;onBack:()=>void}){
  const {send,cancel,conversation,markCardSeen}=useAppData();
  const insets=useSafeAreaInsets();
  const [draft,setDraft]=useState('');
  const [speaking,setSpeaking]=useState(false);
  const progress=useRef(new Map<string,number>()).current;
  const state=conversation(finding.id,finding.agentId);
  useEffect(()=>{
    const mark=()=>{if(AppState.currentState==='active')void markCardSeen(finding.id).catch(()=>{});};
    mark();const listener=AppState.addEventListener('change',value=>{if(value==='active')mark();});
    return ()=>listener.remove();
  },[finding.id,markCardSeen]);
  const onAction=(text:string)=>{
    if(!text.trim()||state.status==='thinking')return;
    setDraft('');Keyboard.dismiss();void send(finding.id,text,finding.agentId);
  };
  return <View style={[styles.screen,{paddingTop:insets.top,paddingBottom:Math.max(12,insets.bottom)}]} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={()=>{Keyboard.dismiss();onBack();}} style={styles.back}><AppText style={styles.backText}>Back</AppText></Pressable>
    <ScrollView style={styles.content} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <FindingContent finding={finding} onAction={onAction}/>
    </ScrollView>
    <View style={styles.reply}><TypewriterReply messages={responseMessages(state)} progress={progress} onAction={onAction} working={state.status==='thinking'} onSpeakingChange={setSpeaking}/></View>
    {state.status==='thinking'&&<AppText accessibilityLiveRegion="polite" style={styles.working}>Working…</AppText>}
    <View style={styles.composer}><Composer value={draft} setValue={setDraft} onSend={()=>onAction(draft)} onCancel={()=>{setSpeaking(false);void cancel(finding.id,finding.agentId);}} running={state.status==='thinking'||speaking||state.stopFailed===true} keyboardActive={false}/></View>
  </View>;
}
const styles=StyleSheet.create({
  screen:{...StyleSheet.absoluteFill,zIndex:200,backgroundColor:colors.background},
  back:{minHeight:48,paddingHorizontal:layout.gutter,justifyContent:'center',alignSelf:'flex-start'},
  backText:{fontFamily:fonts.semibold,fontSize:16,color:colors.blue},
  content:{flex:1},body:{paddingHorizontal:layout.gutter,paddingTop:8,paddingBottom:28},
  reply:{height:94,marginHorizontal:layout.gutter},
  composer:{flexDirection:'row',marginHorizontal:layout.gutter,marginTop:8},
  working:{fontSize:12,color:colors.secondary,marginHorizontal:layout.gutter},
});
