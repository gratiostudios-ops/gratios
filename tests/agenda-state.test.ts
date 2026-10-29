import assert from 'node:assert/strict';
import test from 'node:test';
import {applyCompletion,applyPendingCompletions} from '../src/data/agenda-state';
import type {MobileData,Task} from '../src/data/types';
const task:Task={id:'task',kind:'task',title:'Gym'};
const event:Task={id:'event',kind:'calendar',title:'Meeting'};
const initial={snapshot:{tasks:[task,event],findings:[]},agendaItems:[{...task,completed:false,allDay:false},{...event,completed:false,allDay:false}]} as unknown as MobileData;
test('agenda completion updates immediately while preserving unrelated reminders',()=>{
 const next=applyCompletion(initial,task.id,{completed:true});
 assert.equal(next.agendaItems?.[0]?.completed,true);
 assert.deepEqual(next.snapshot.tasks,[event]);
 assert.equal(initial.agendaItems?.[0]?.completed,false);
});
test('stale refresh cannot overwrite a pending check or uncheck',()=>{
 const pending=new Map([[task.id,{completed:true}]]);
 assert.equal(applyPendingCompletions(initial,pending).agendaItems?.[0]?.completed,true);
 const checked=applyCompletion(initial,task.id,{completed:true});
 const restoring=new Map([[task.id,{completed:false,task}]]);
 const next=applyPendingCompletions(checked,restoring);
 assert.equal(next.agendaItems?.[0]?.completed,false);
 assert.ok(next.snapshot.tasks.some(item=>item.id===task.id));
});
test('failed save can roll back without changing another item',()=>{
 const optimistic=applyCompletion(initial,task.id,{completed:true});
 const rollback=applyCompletion(optimistic,task.id,{completed:false,task});
 assert.equal(rollback.agendaItems?.[0]?.completed,false);
 assert.equal(rollback.agendaItems?.[1]?.completed,false);
 assert.deepEqual(new Set(rollback.snapshot.tasks.map(item=>item.id)),new Set(['event','task']));
});
