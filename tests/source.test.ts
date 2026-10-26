import assert from 'node:assert/strict';
import test from 'node:test';
import { demoData, demoSnapshots } from '../src/data/demo';
import { createDemoSource } from '../src/data/source';
import type { Snapshot } from '../src/data/types';

test('configured agents never produce implicit findings in an empty payload', async () => {
  const source = createDemoSource(demoSnapshots.empty, 0);
  assert.ok(demoData.agents.length > 0);
  assert.deepEqual((await source.load()).findings, []);
});

test('pushed snapshots can add and remove findings, preserving their supplied order', async () => {
  const source = createDemoSource(demoSnapshots.empty, 0);
  const updates: Snapshot[] = [];
  const unsubscribe = source.subscribe!(snapshot => updates.push(snapshot));
  source.publishSnapshot(demoSnapshots.multiple);
  assert.deepEqual(updates[0].findings.map(finding => finding.id), demoSnapshots.multiple.findings.map(finding => finding.id));
  source.publishSnapshot(demoSnapshots.single);
  source.publishSnapshot(demoSnapshots.empty);
  assert.equal((await source.load()).findings.length, 0);
  assert.equal(updates.length, 3);
  unsubscribe();
  source.publishSnapshot(demoSnapshots.multiple);
  assert.equal(updates.length, 3);
});

test('completing a task preserves calendar items and agent findings and publishes the result', async () => {
  const source = createDemoSource(demoSnapshots.calendar, 0);
  let lastUpdate: Snapshot | undefined;
  source.subscribe!(snapshot => { lastUpdate = snapshot; });
  await source.completeTask('gym-task');
  assert.deepEqual(lastUpdate?.tasks.map(task => task.id), ['director', 'reception']);
  assert.deepEqual(lastUpdate?.findings, demoSnapshots.calendar.findings);
  assert.equal(demoSnapshots.calendar.tasks.length, 3);
  await source.completeTask('director');
  await source.completeTask('reception');
  assert.deepEqual((await source.load()).tasks, []);
});

test('messages work without an agent and canned replies can provide follow-up actions', async () => {
  const source = createDemoSource(demoSnapshots.empty, 0);
  const generic = await source.sendMessage({ text: 'Hello', findingId: null });
  assert.ok(generic.text.length > 0);
  const reply = await source.sendMessage({ text: 'Draft a reply to Jacob', findingId: null });
  assert.ok(reply.actions?.length);
  const shorter = await source.sendMessage({ text: reply.actions![0].message, findingId: null });
  assert.ok(shorter.text.length < reply.text.length);
});
