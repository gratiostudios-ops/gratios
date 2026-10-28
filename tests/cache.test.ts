import assert from 'node:assert/strict';
import test from 'node:test';
import { MobileCache } from '../src/data/cache';
import { ApiError, GatewayClient, type Session, type TokenStorage } from '../src/data/api';
import type { MobileData } from '../src/data/types';

const data: MobileData = { snapshot: { tasks: [], findings: [] }, agents: [], feed: [], documents: {}, conversations: [], profile: { name: 'Alice', email: 'alice@example.com', dob: '', interests: [], preferences: [], avatar: { asset: 'avatar' } } };
function store() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
}
function secure() {
  let token: string | null = null, snapshot: string | null = null;
  const storage: TokenStorage = { get: async () => token, set: async value => { token = value; }, getSession: async () => snapshot, setSession: async value => { snapshot = value; }, clear: async () => { token = null; snapshot = null; } };
  return storage;
}
const session: Session = { userId: 'alice', access_token: 'cached-access', refresh_token: 'saved-refresh', expires_in: 3600, token_type: 'bearer' };

test('cached credentials restore immediately without network; offline revalidation preserves them', async () => {
  const storage = secure();
  await new GatewayClient('http://localhost', storage).accept(session);
  let calls = 0;
  const restored = new GatewayClient('http://localhost', storage, (async () => { calls++; throw new Error('offline'); }) as typeof fetch);
  assert.equal(await restored.restoreCached(), true);
  assert.equal(restored.cacheIdentity, 'alice');
  assert.equal(calls, 0);
  await assert.rejects(restored.revalidate(), /Cannot reach/);
  assert.equal(await storage.get(), 'saved-refresh');
  assert.equal(restored.requiresSignIn, false);
});

test('rejected refresh preserves cached identity and blocks even unexpired authorized actions until sign-in', async () => {
  const storage = secure();
  let calls = 0;
  const client = new GatewayClient('http://localhost', storage, (async () => { calls++; return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 }); }) as typeof fetch);
  await client.accept(session);
  await assert.rejects(client.revalidate(), ApiError);
  assert.equal(client.requiresSignIn, true);
  assert.equal(client.cacheIdentity, 'alice');
  assert.equal(await storage.get(), 'saved-refresh');
  await assert.rejects(client.request('/gateway/profile', { method: 'PUT' }), /Sign in again/);
  assert.equal(calls, 1);
  await client.accept({ ...session, access_token: 'renewed' });
  assert.equal(client.requiresSignIn, false);
});

test('cache isolates accounts and logout invalidates pending and subsequent writes from old leases', async () => {
  const storage = store(), cache = new MobileCache(storage);
  const alice = cache.open('alice'), bob = cache.open('bob');
  await alice.write(data);
  assert.equal((await alice.read())?.profile.name, 'Alice');
  assert.equal(await bob.read(), null);
  const pending = alice.write(data);
  await cache.clear('alice');
  await pending;
  await alice.write(data);
  assert.equal(await cache.open('alice').read(), null);
  assert.equal(storage.values.size, 0);
});

test('corrupt and incompatible cache envelopes are ignored safely', async () => {
  const storage = store(), cache = new MobileCache(storage);
  for (const raw of ['{', JSON.stringify({ version: 2, userId: 'alice', data }), JSON.stringify({ version: 1, userId: 'bob', data }), JSON.stringify({ version: 1, userId: 'alice', data: { ...data, snapshot: {} } })]) {
    storage.values.set('avocado.mobile.v1:alice', raw);
    assert.equal(await cache.open('alice').read(), null);
  }
});

test('explicit logout removes both secure credentials and the locally restored session', async () => {
  const storage = secure(), client = new GatewayClient('http://localhost', storage);
  await client.accept(session);
  await client.logout();
  assert.equal(await storage.get(), null);
  assert.equal(await client.restoreCached(), false);
  assert.equal(client.cacheIdentity, null);
});
