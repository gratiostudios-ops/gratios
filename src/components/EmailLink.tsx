import React from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { AppText } from './UI';
import { isGmailMessageUrl } from '../../../backend/shared/email-link';
import { fonts } from '../theme';
export function EmailLink({block}:{block:{url?:string;label?:string}}){
  if(!isGmailMessageUrl(block.url))return null;
  const url=block.url;
  return <AppText accessibilityRole="link" accessibilityLabel={block.label??'Open email'} style={styles.link} onPress={event=>{
    event.stopPropagation();void Linking.openURL(url).catch(()=>Alert.alert('Could not open email','Open Gmail and try again.'));
  }}>{block.label??'Open email'}</AppText>;
}
const styles=StyleSheet.create({link:{fontFamily:fonts.medium,fontSize:16,lineHeight:22,color:'#6195ff',textDecorationLine:'underline',alignSelf:'flex-start',paddingVertical:3}});
