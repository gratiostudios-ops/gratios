import type { Finding } from '../src/data/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import { pendingRequestText, visibleFindingId, homeFindings, findingPreview } from '../src/data/home-interaction';

test('active icon follows the nearest card immediately, even when fast scrolling skips pages', () => {
  const cards = ['general', 'calendar', 'email', 'travel'].map(id => ({ id }));
  assert.equal(visibleFindingId(cards, 850, 400), 'email');
  assert.equal(visibleFindingId(cards, 1190, 400), 'travel');
  assert.equal(visibleFindingId(cards, 410, 400), 'calendar');
  assert.equal(visibleFindingId(cards, -50, 400), 'general');
  assert.equal(visibleFindingId(cards, 2000, 400), 'travel');
  assert.equal(visibleFindingId([], 0, 400), null);
  assert.equal(visibleFindingId(cards, 400, 0), null);
});

test('sent text appears before acceptance and disappears when results arrive or the request ends', () => {
  const thinking = { status: 'thinking', requestText: 'Summarise my email' };
  assert.equal(pendingRequestText(thinking), 'Summarise my email');
  assert.equal(pendingRequestText({ ...thinking, reply: { text: 'Here is your summary' } }), null);
  assert.equal(pendingRequestText({ ...thinking, replies: [{ reply: { text: 'A streamed result' } }] }), null);
  for (const status of ['reply', 'idle', 'error']) assert.equal(pendingRequestText({ ...thinking, status }), null);
  assert.equal(pendingRequestText({ status: 'thinking' }), null);
});

test('featured choice is separate from the newest-first list and stale/legacy snapshots fall back',()=>{
  const cards=['newest','chosen','older'].map(id=>({id,blocks:[],suggestions:[]} as unknown as Finding));
  const result=homeFindings({tasks:[],findings:cards,featuredFindingId:'chosen'});
  assert.equal(result.featured?.id,'chosen');
  assert.deepEqual(result.others.map(item=>item.id),['newest','older']);
  for(const featuredFindingId of [undefined,null,'missing'])assert.equal(homeFindings({tasks:[],findings:cards,featuredFindingId}).featured?.id,'newest');
  assert.deepEqual(homeFindings({tasks:[],findings:[]}),{featured:null,others:[]});
  assert.equal(findingPreview({...cards[0],blocks:[{id:'p',type:'paragraph',text:'Useful detail'}]}),'Useful detail');
});
