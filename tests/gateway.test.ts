import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, GatewayClient, type Session, type TokenStorage } from '../src/data/api';
import { createRemoteSource } from '../src/data/remote';

const session = (access = 'access', expiry = 3600): Session => ({ access_token: access, refresh_token: 'refresh-' + access, expires_in: expiry, token_type: 'bearer' });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function memoryStorage(initial: string | null = null) {
  let value = initial;
  const storage: TokenStorage = { get: async () => value, set: async next => { value = next; }, clear: async () => { value = null; } };
  return storage;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test('concurrent authenticated requests share one token refresh and persist rotated refresh credentials', async () => {
  const storage = memoryStorage();
  const response = deferred<Response>();
  let refreshes = 0;
  const client = new GatewayClient('http://localhost:4104', storage, (async (input, init) => {
    if (String(input).endsWith('/auth/refresh')) { refreshes++; return response.promise; }
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer renewed');
    return json({ ok: true });
  }) as typeof fetch);
  await client.accept(session('old', 0));
  const requests = Promise.all([client.request('/one'), client.request('/two')]);
  response.resolve(json({ session: session('renewed') }));
  assert.deepEqual(await requests, [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
  assert.equal(await storage.get(), 'refresh-renewed');
});

test('logout during restore cannot reinstall an old session or leave its credential stored', async () => {
  const storage = memoryStorage('saved');
  const response = deferred<Response>();
  const entered = deferred<void>();
  const client = new GatewayClient('http://localhost:4104', storage, (async () => { entered.resolve(); return response.promise; }) as typeof fetch);
  const restoring = client.restore();
  await entered.promise;
  await client.logout();
  response.resolve(json({ session: session('old-user') }));
  await assert.rejects(restoring, /Session ended/);
  assert.equal(await storage.get(), null);
});

test('an old authenticated response is rejected after account switch', async () => {
  const response = deferred<Response>();
  const entered = deferred<void>();
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async () => { entered.resolve(); return response.promise; }) as typeof fetch);
  await client.accept(session('alice'));
  const request = client.request('/private');
  await entered.promise;
  await client.accept(session('bob'));
  response.resolve(json({ secret: 'alice' }));
  await assert.rejects(request, (error: unknown) => error instanceof ApiError && error.status === 401);
});

test('remote messages poll through delegated execution instead of treating dispatch as a reply', async () => {
  const urls: string[] = [];
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (input, init) => {
    const url = String(input); urls.push(url);
    if (url.endsWith('/gateway/messages')) {
      const body = JSON.parse(init?.body as string);
      assert.equal(body.idempotencyKey, 'generated-id');
      assert.equal(body.findingId, null);
      return json({ id: 'message', conversationId: 'thread', status: 'queued' }, 202);
    }
    return json(urls.length === 2 ? { id: 'message', conversationId: 'thread', status: 'running' } : { id: 'message', conversationId: 'thread', status: 'completed', reply: { text: 'Real summary' } });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'generated-id', async () => {});
  assert.deepEqual(await source.sendMessage({ text: 'Summarize inbox', findingId: null }), { text: 'Real summary' });
  assert.equal(urls.length, 3);
});

test('uncertain submission retries retain the same idempotency key', async () => {
  const keys: string[] = [];
  let generated = 0;
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (_input, init) => {
    keys.push(JSON.parse(init?.body as string).idempotencyKey);
    if (keys.length === 1) throw new Error('network lost after server accepted request');
    return json({ id: 'message', conversationId: 'thread', status: 'completed', reply: { text: 'Recovered result' } });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'key-' + ++generated);
  const request = { text: 'Summarize', findingId: null };
  await assert.rejects(source.sendMessage(request), /Cannot reach/);
  assert.equal((await source.sendMessage(request)).text, 'Recovered result');
  assert.deepEqual(keys, ['key-1', 'key-1']);
});

test('mobile loads restore durable pending conversations and disposal stops polling', async () => {
  const paused = deferred<void>();
  const entered = deferred<void>();
  let calls = 0;
  const mobile = { snapshot: { tasks: [], findings: [] }, conversations: [{ id: 'thread', findingId: null, messages: [{ id: 'message', text: 'Summarize', status: 'running' }] }] };
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async input => {
    calls++;
    return json(String(input).endsWith('/gateway/mobile') ? mobile : { id: 'message', conversationId: 'thread', status: 'running' });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'id', () => { entered.resolve(); return paused.promise; });
  assert.deepEqual((await source.loadMobile!()).conversations, mobile.conversations);
  const sending = source.sendMessage({ text: 'Summarize', findingId: null });
  await entered.promise; source.dispose!(); paused.resolve();
  await assert.rejects(sending, /Session ended/);
  assert.equal(calls, 2);
});
