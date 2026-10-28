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

test('old replies stay out of the live reply area while current requests survive reconnects', async () => {
  const { sessionMessage } = await import('../src/data/conversations');
  const old = { id: 'old', text: 'Summarize mail', status: 'completed' as const, reply: { text: 'Yesterday summary' } };
  const current = { id: 'current', text: 'Hello', status: 'running' as const, reply: { text: 'Hello back' } };
  const accepted = new Set<string>();
  assert.equal(sessionMessage([old], accepted), undefined);
  accepted.add(current.id);
  assert.equal(sessionMessage([old, current], accepted), current);
  const reconnected = { ...current, status: 'completed' as const };
  assert.equal(sessionMessage([old, reconnected], accepted), reconnected);
  assert.equal(sessionMessage([old, reconnected], new Set()), undefined, 'a reopened app starts with no live replies');
});
