import {openEmailWithFallback} from '../data/email-opening';
import React,{useRef,useState} from 'react';
import { Alert, Linking, Platform, StyleSheet } from 'react-native';
import { AppText } from './UI';
import { isGmailMessageUrl } from '../../../backend/shared/response';
import { fonts } from '../theme';
export function EmailLink({block}:{block:{url?:string;label?:string}}){
  const opening=useRef(false);
  const [busy,setBusy]=useState(false);
  if(!isGmailMessageUrl(block.url))return null;
  const url=block.url;
  return <AppText accessibilityRole="link" accessibilityLabel={block.label??'Open email'} style={[styles.link,busy&&{opacity:0.5}]} accessibilityState={{disabled:busy}} onPress={event=>{
    event.stopPropagation();if(opening.current)return;opening.current=true;setBusy(true);
    const open=async()=>{
      if(Platform.OS==='web'){await Linking.openURL(url);return;}
      await openEmailWithFallback(url,async()=>{
        if(Platform.OS!=='android')throw new Error('Native Gmail route unavailable');
        const {startActivityAsync}=await import('expo-intent-launcher');
        await startActivityAsync('android.intent.action.VIEW',{data:url,packageName:'com.google.android.gm'});
      },()=>new Promise<boolean>(resolve=>Alert.alert('Open email in browser?','Gmail could not open this email in the app.',[
        {text:'Cancel',style:'cancel',onPress:()=>resolve(false)},
        {text:'Open in browser',onPress:()=>resolve(true)},
      ],{cancelable:true,onDismiss:()=>resolve(false)})),async source=>{
        const {openBrowserAsync}=await import('expo-web-browser');await openBrowserAsync(source);
      });
    };
    void open().catch(()=>Alert.alert('Could not open email','Open Gmail and try again.')).finally(()=>{opening.current=false;setBusy(false);});
  }}>{block.label??'Open email'}</AppText>;
}
const styles=StyleSheet.create({link:{fontFamily:fonts.medium,fontSize:16,lineHeight:22,color:'#6195ff',textDecorationLine:'underline',alignSelf:'flex-start',paddingVertical:3}});
