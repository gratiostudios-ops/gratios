import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationKey, responseMessages } from '../src/data/conversations';

test('different cards from the same agent restore one conversation', () => {
  assert.equal(conversationKey({ findingId: 'card-a', agentId: 'agent-one' }), conversationKey({ findingId: 'card-b', agentId: 'agent-one' }));
  assert.notEqual(conversationKey({ agentId: 'agent-one' }), conversationKey({ agentId: 'agent-two' }));
});

test('failures follow partial replies and retain retry actions', () => {
  const partial = { id: 'partial', reply: { text: 'Checking your calendar.' } };
  const error = { text: 'Calendar unavailable', actions: [{ id: 'retry', label: 'Try again', message: 'Plan today' }] };
  const messages = responseMessages({ status: 'error', messageId: 'request', replies: [partial], reply: error });
  assert.deepEqual(messages.map(message => message.reply), [partial.reply, error]);
  assert.notEqual(messages[0]!.id, messages[1]!.id);
  assert.deepEqual(responseMessages({ status: 'error', reply: error }).map(message => message.reply), [error]);
  assert.deepEqual(responseMessages({ status: 'reply', replies: [partial], reply: partial.reply }), [partial]);
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
