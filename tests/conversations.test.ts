import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationKey } from '../src/data/conversations';

test('different cards from the same agent restore one conversation', () => {
  assert.equal(conversationKey({ findingId: 'card-a', agentId: 'agent-one' }), conversationKey({ findingId: 'card-b', agentId: 'agent-one' }));
  assert.notEqual(conversationKey({ agentId: 'agent-one' }), conversationKey({ agentId: 'agent-two' }));
});

test('orchestrator history restores to general chat without merging an agent conversation', () => {
  assert.equal(conversationKey({ agentId: 'orchestrator-instance', role: 'orchestrator' }), conversationKey({ findingId: null }));
  assert.notEqual(conversationKey({ agentId: 'agent-one', role: 'agent' }), conversationKey({ findingId: null }));
});
