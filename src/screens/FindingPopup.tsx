import React,{useEffect} from 'react';
import { AppState, Keyboard, Modal, ScrollView, StyleSheet, View } from 'react-native';
import Svg,{Path} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticPressable as Pressable } from '../components/HapticControls';
import { FindingContent } from '../components/FindingContent';
import { useAppData } from '../data/AppData';
import type { Finding } from '../data/types';
import { colors,layout } from '../theme';

/** Holds the opened card snapshot even if subsequent agent results replace it. */
export function FindingPopup({finding,onClose}:{finding:Finding;onClose:()=>void}){
  const {markCardSeen}=useAppData();
  const insets=useSafeAreaInsets();
  useEffect(()=>{
    const mark=()=>{if(AppState.currentState==='active')void markCardSeen(finding.id).catch(()=>{});};
    mark();const listener=AppState.addEventListener('change',value=>{if(value==='active')mark();});
    return ()=>listener.remove();
  },[finding.id,markCardSeen]);
  const close=()=>{Keyboard.dismiss();onClose();};
  return <Modal transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
    <View style={[styles.scrim,{paddingTop:insets.top+16,paddingBottom:Math.max(16,insets.bottom)}]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss update popup" style={StyleSheet.absoluteFill} onPress={close}/>
    <View style={styles.panel} accessibilityViewIsModal accessibilityLabel="Update details">
    <Pressable accessibilityRole="button" accessibilityLabel="Close update" onPress={close} style={styles.closeTarget} hitSlop={4}>
      <View style={styles.closeCircle}><Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M5 5L15 15M15 5L5 15" stroke="#b6b6bc" strokeWidth={2.5} strokeLinecap="round"/></Svg></View>
    </Pressable>
    <ScrollView style={styles.content} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <FindingContent finding={finding} showActions={false} onAction={()=>{}}/>
    </ScrollView>
    </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
  scrim:{flex:1,backgroundColor:'rgba(0,0,0,0.65)',alignItems:'center',justifyContent:'center',paddingHorizontal:16},
  panel:{width:'100%',maxWidth:540,maxHeight:'90%',flexShrink:1,backgroundColor:colors.background,borderRadius:24,borderWidth:1,borderColor:'#343434',overflow:'hidden',paddingBottom:16},
  closeTarget:{width:48,height:48,marginTop:8,marginRight:8,alignItems:'center',justifyContent:'center',alignSelf:'flex-end'},
  closeCircle:{width:36,height:36,borderRadius:18,backgroundColor:'#2c2c2e',alignItems:'center',justifyContent:'center'},
  content:{flexGrow:0,flexShrink:1},body:{paddingHorizontal:layout.gutter,paddingTop:8,paddingBottom:28},
});
