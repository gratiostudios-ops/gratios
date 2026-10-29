import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import type {Task} from './types';
import {newBannerState,updateBanners,type BannerState} from './task-banner-state';

// Launch state survives Home remounts; each signed-in account has its own state.
const launches=new Map<string,BannerState>();
export function useTaskStack(tasks:Task[],loading:boolean,isActive:boolean,identity:string){
  const [now,setNow]=useState(Date.now());
  const [state,setState]=useState(()=>launches.get(identity)??newBannerState());
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    const sub=AppState.addEventListener('change',value=>{if(value==='active')setNow(Date.now());});
    return()=>{clearInterval(timer);sub.remove();};
  },[]);
  useEffect(()=>{
    if(loading||!isActive)return;
    const next=updateBanners(launches.get(identity)??newBannerState(),tasks,Date.now());
    launches.set(identity,next);setState(next);
  },[tasks,loading,isActive,identity,now]);
  const expanded=state.manual||now<state.expandedUntil;
  return {items:loading||!isActive?[]:state.order.flatMap(id=>{const task=tasks.find(item=>item.id===id);return task?[task]:[];}),expanded,
    toggle:()=>setState(previous=>{
      const next={...previous,manual:!expanded,expandedUntil:0};launches.set(identity,next);return next;
    })};
}
