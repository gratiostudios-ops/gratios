import React from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from './UI';
import { fonts } from '../theme';
export function AgentPill({name}:{name?:string}){
  return name?<AppText style={styles.pill}>{name}</AppText>:null;
}
const styles=StyleSheet.create({pill:{alignSelf:'flex-start',fontFamily:fonts.medium,fontSize:11,lineHeight:16,color:'#6195ff',backgroundColor:'#252525',paddingHorizontal:12,paddingVertical:3,borderRadius:12,overflow:'hidden'}});
