import { HapticPressable as Pressable } from './HapticControls';
import React,{useEffect,useRef,useState} from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import type {Task} from '../data/types';
import {colors} from '../theme';
import {AppText} from './UI';
import {TaskCard} from './TaskCard';

function BannerRow({task,visible,onComplete,error}:{task:Task;visible:boolean;onComplete:(task:Task)=>Promise<boolean>;error?:string}){
  const [height,setHeight]=useState(45);
  const progress=useRef(new Animated.Value(visible?1:0)).current;
  useEffect(()=>{
    const animation=Animated.timing(progress,{toValue:visible?1:0,duration:280,easing:Easing.inOut(Easing.cubic),useNativeDriver:false});
    animation.start();return()=>animation.stop();
  },[visible,progress]);
  return <Animated.View accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'}
    style={{height:progress.interpolate({inputRange:[0,1],outputRange:[0,height+8]}),overflow:'hidden',opacity:progress}}>
    <Animated.View onLayout={event=>setHeight(event.nativeEvent.layout.height)} style={{transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[-height,0]})}]}}>
      <TaskCard task={task} onComplete={()=>onComplete(task)} error={error}/>
    </Animated.View>
  </Animated.View>;
}
export function TaskBannerStack({items,expanded,onToggle,onComplete,errors}:{items:Task[];expanded:boolean;onToggle:()=>void;onComplete:(task:Task)=>Promise<boolean>;errors?:Record<string,string>}){
  if(!items.length)return null;
  return <View style={styles.stack}>
    <AppText style={styles.label}>Have you completed this</AppText>
    <View style={styles.row}><View style={styles.items}>
      {items.map((task,index)=><BannerRow key={task.id} task={task} visible={expanded||index===items.length-1||!!errors?.[task.id]} onComplete={onComplete} error={errors?.[task.id]}/>)}
    </View>{items.length>1&&<Pressable accessibilityRole="button" accessibilityLabel={expanded?'Collapse reminders':'Expand reminders'} accessibilityState={{expanded}}
      style={styles.toggle} onPress={onToggle}>
      <Svg width={25} height={25} viewBox="0 0 25 25"><Circle cx={12.5} cy={12.5} r={10.5} stroke="#bdbdbd" strokeWidth={2.5} fill="none"/>
        <Path d={expanded?'M8 14.5 12.5 10 17 14.5':'M8 10.5 12.5 15 17 10.5'} stroke="#bdbdbd" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </Svg>
    </Pressable>}</View>
  </View>;
}
const styles=StyleSheet.create({
  stack:{paddingTop:8,paddingBottom:0,paddingLeft:10},label:{fontSize:12,lineHeight:14,letterSpacing:0.12,color:colors.muted,marginLeft:2,marginBottom:8},
  row:{flexDirection:'row',alignItems:'flex-end'},items:{flex:1},toggle:{width:44,height:45,marginBottom:8,alignItems:'center',justifyContent:'center'},
});
