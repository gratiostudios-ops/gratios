import React,{useEffect,useState} from 'react';
import {Modal,Pressable,ScrollView,View,AppState} from 'react-native';
import {gateway,demoMode} from '../auth/Auth';
import {AppText} from './UI';
type Item={id:string;kind:'task'|'calendar';title:string;dueAt:string;completed:boolean;allDay:boolean};
export function TodayAgenda(){
  const [open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]),[error,setError]=useState('');
  useEffect(()=>{if(!open)return;let active=true;const load=async()=>{try{const data=await gateway.request<{items:Item[]}>('/gateway/agenda?timezone='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone));if(active){setItems(data.items);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Agenda unavailable');}};void load();const timer=setInterval(()=>{void load();},10000);const sub=AppState.addEventListener('change',state=>{if(state==='active')void load();});return()=>{active=false;clearInterval(timer);sub.remove();};},[open]);
  if(demoMode)return null;
  return <><Pressable accessibilityRole="button" onPress={()=>setOpen(true)} style={{padding:8}}><AppText style={{color:'#aaa'}}>Today</AppText></Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)} presentationStyle="pageSheet"><View style={{flex:1,backgroundColor:'#0d0d0d',padding:24,paddingTop:52}}>
      <Pressable accessibilityRole="button" onPress={()=>setOpen(false)}><AppText style={{color:'#487ee5'}}>Close</AppText></Pressable><AppText style={{fontSize:26,marginVertical:24}}>Today</AppText>
      <ScrollView>{error?<AppText>{error}</AppText>:!items.length?<AppText>No tasks or events today.</AppText>:items.map(item=><View key={item.id} style={{borderLeftWidth:4,borderLeftColor:item.kind==='task'?'#e54865':'#487ee5',padding:16,marginBottom:12,opacity:item.completed?0.55:1}}><AppText>{item.title}</AppText><AppText style={{color:'#aaa',marginTop:6}}>{item.allDay?'All day':new Date(item.dueAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · {item.kind==='task'?(item.completed?'Completed':'Task'):(item.completed?'Reminder dismissed':'Calendar')}</AppText></View>)}</ScrollView>
    </View></Modal></>;
}
