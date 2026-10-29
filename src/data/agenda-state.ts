import type {MobileData,Task} from './types';
import {reminderTimeEligible} from '../../../backend/shared/reminders';

export type CompletionUpdate={completed:boolean;task?:Task};
export function applyCompletion(data:MobileData,id:string,{completed,task}:CompletionUpdate):MobileData{
  const tasks=data.snapshot.tasks.filter(item=>item.id!==id);
  if(!completed&&task&&reminderTimeEligible(task,Date.now()))tasks.push(task);
  return {...data,agendaItems:data.agendaItems?.map(item=>item.id===id?{...item,completed}:item),snapshot:{...data.snapshot,tasks}};
}
export function applyPendingCompletions(data:MobileData,pending:Map<string,CompletionUpdate>):MobileData{
  for(const [id,update] of pending)data=applyCompletion(data,id,update);
  return data;
}
