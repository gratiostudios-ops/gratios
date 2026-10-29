import assert from 'node:assert/strict';
import test from 'node:test';
import {newBannerState,updateBanners} from '../src/data/task-banner-state';
import type {Task} from '../src/data/types';
const first:Task={id:'a',kind:'calendar',title:'Meeting'};
const second:Task={id:'b',kind:'task',title:'Gym'};
test('hard opening expands for five seconds; refresh and resume do not restart the timer',()=>{
  const opened=updateBanners(newBannerState(),[first,second],1000);
  assert.deepEqual(opened.order,['a','b']);assert.equal(opened.expandedUntil,6000);
  assert.equal(updateBanners(opened,[first,second],9000).expandedUntil,6000);
});
test('arrivals append, extend display, and completed rows disappear',()=>{
  const old=updateBanners(newBannerState(),[second],1000);
  const arrived=updateBanners(old,[first,second],7000);
  assert.deepEqual(arrived.order,['b','a']);assert.equal(arrived.expandedUntil,12000);
  assert.deepEqual(updateBanners(arrived,[first],8000).order,['a']);
});
test('future reminders stay hidden; manual expansion survives refresh',()=>{
  const state=updateBanners({...newBannerState(),manual:true},[{...first,dueAt:'2099-01-01T00:00:00Z'}],1000);
  assert.deepEqual(state.order,[]);assert.equal(state.manual,true);
});
