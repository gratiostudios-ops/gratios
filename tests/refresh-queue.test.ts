import assert from 'node:assert/strict';
import test from 'node:test';
import { createRefreshQueue } from '../src/data/refresh-queue';

test('completion during a load queues a fresh load before callers resolve', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const refresh = createRefreshQueue(async () => { if (++calls === 1) await gate; });
  const first = refresh();
  const second = refresh();
  refresh();
  assert.equal(first, second);
  assert.equal(calls, 1);
  release();
  await second;
  assert.equal(calls, 2, 'overlapping requests are coalesced into one fresh reload');
});

test('a stale result reloads immediately without waiting for foreground polling', async () => {
  let calls = 0;
  const refresh = createRefreshQueue(async () => ++calls === 1);
  await refresh();
  assert.equal(calls, 2);
});

test('a failed reload releases the queue so a later retry can succeed', async () => {
  let calls = 0;
  const refresh = createRefreshQueue(async () => { if (++calls === 1) throw new Error('Offline'); });
  await assert.rejects(refresh(), /Offline/);
  await refresh();
  assert.equal(calls, 2);
});
