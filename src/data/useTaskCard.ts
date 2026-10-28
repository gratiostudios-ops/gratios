import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import type {Task} from './types';
export function useTaskCard(tasks:Task[],loading:boolean,isActive:boolean){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);const sub=AppState.addEventListener('change',state=>{if(state==='active')setNow(Date.now());});return()=>{clearInterval(timer);sub.remove();};},[]);
  if(loading||!isActive)return null;
  return [...tasks].filter(task=>!task.dueAt||Date.parse(task.dueAt)<=now).sort((a,b)=>(Date.parse(a.dueAt??'')||0)-(Date.parse(b.dueAt??'')||0))[0]??null;
}
