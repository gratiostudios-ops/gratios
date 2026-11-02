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

test('slow chat polling gets 45 seconds and identifies the operation on timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | undefined;
  const client = new GatewayClient('https://example.com', memoryStorage(), (async (_input, init) => {
    assert.equal((init!.headers as Record<string, string>)['X-Avocado-Request-Timeout-Ms'], '45000');
    signal = init!.signal!;
    return new Promise<Response>((_resolve, reject) => signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  }) as typeof fetch);
  const result = client.request('/gateway/messages/message-id', {}, false);
  const rejected = assert.rejects(result, /timed out while checking your chat reply/);
  t.mock.timers.tick(15000);
  assert.equal(signal!.aborted, false, 'a request can outlast the former 15-second limit');
  t.mock.timers.tick(30000);
  await rejected;
});

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

test('chat pushes every reply before completion without status polling, including reconnect snapshots', async t => {
  const urls: string[] = [];
  const posted = deferred<void>();
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async input => {
    urls.push(String(input)); posted.resolve();
    return json({ id: 'message', conversationId: 'thread', status: 'queued' }, 202);
  }) as typeof fetch);
  await client.accept(session());
  type Conversations = import('../src/data/types').MobileData['conversations'];
  let push!: (value: Conversations) => void;
  let stops = 0;
  t.mock.method(client, 'stream', (_path: string, callback: (value: Conversations) => void) => { push = callback; return () => { stops++; }; });
  const source = createRemoteSource(client, () => 'generated-id');
  const received: Conversations[] = [];
  source.subscribeChat!(value => received.push(value));
  let finished = false;
  const sending = source.sendMessage({ text: 'Summarize inbox', findingId: null }).then(reply => { finished = true; return reply; });
  await posted.promise;
  const snapshot = (status: 'running' | 'completed', texts: string[]): Conversations => [{ id: 'thread', findingId: null,
    messages: [{ id: 'message', text: 'Summarize inbox', status, reply: { text: texts.at(-1)! }, replies: texts.map((text, i) => ({ id: String(i), reply: { text } })) }] }];
  push(snapshot('running', ['Reading emails']));
  await Promise.resolve();
  assert.equal(finished, false);
  source.setForeground!(false); assert.equal(stops, 1);
  source.setForeground!(true);
  push(snapshot('running', ['Reading emails', 'Found two actions']));
  push(snapshot('completed', ['Reading emails', 'Found two actions', 'Done']));
  assert.deepEqual(await sending, { text: 'Done' });
  assert.equal(received[1]![0]!.messages[0]!.replies!.length, 2);
  assert.deepEqual(urls, ['http://localhost:4104/gateway/messages']);
  source.dispose!(); assert.equal(stops, 2);
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

test('mobile restores pending conversations and disposal rejects asynchronous requests', async () => {
  const posted = deferred<void>();
  let calls = 0;
  const mobile = { snapshot: { tasks: [], findings: [] }, conversations: [{ id: 'thread', findingId: null, messages: [{ id: 'message', text: 'Summarize', status: 'running' }] }] };
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async input => {
    calls++;
    if (new URL(String(input)).pathname==='/gateway/mobile') return json(mobile);
    posted.resolve(); return json({ id: 'message', conversationId: 'thread', status: 'running' });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'id');
  assert.deepEqual((await source.loadMobile!()).conversations, mobile.conversations);
  const sending = source.sendMessage({ text: 'Summarize', findingId: null });
  const rejection = assert.rejects(sending, /Session ended/);
  await posted.promise; await Promise.resolve(); source.dispose!();
  await rejection;
  assert.equal(calls, 2);
});

test('output-only completion does not fabricate or require a chat reply', async () => {
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (_input, init) => {
    const body = JSON.parse(init?.body as string);
    assert.equal(body.agentId, 'dynamic-agent-id');
    return json({ id: 'message', conversationId: 'conversation', status: 'completed', reply: null });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'submission');
  assert.deepEqual(await source.sendMessage({ text: 'Create a card only', findingId: null, agentId: 'dynamic-agent-id' }), { text: '' });
});

test('card visibility reporting uses a dedicated authenticated endpoint', async () => {
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (input, init) => {
    assert.equal(String(input), 'http://localhost:4104/gateway/cards/card-id/seen');
    assert.equal(init?.method, 'POST');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer access');
    return json({ firstSeenAt: '2026-10-27T10:00:00Z', expiresAt: '2026-10-27T10:30:00Z' });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'submission');
  assert.equal((await source.markCardSeen!('card-id')).expiresAt, '2026-10-27T10:30:00Z');
});

test('private agent documents use scoped uppercase document keys', async () => {
  const writes: { url: string; body: unknown }[] = [];
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (input, init) => {
    assert.equal(init?.method, 'PUT');
    writes.push({ url: String(input), body: JSON.parse(init?.body as string) });
    return json({ saved: true });
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'submission');
  await source.saveDocument!('agent-one:PREFERENCE', 'Prefer concise answers.');
  await source.saveDocument!('agent-two:AGENT', 'Research requested topics.');
  assert.deepEqual(writes, [
    { url: 'http://localhost:4104/gateway/documents/agent-one%3APREFERENCE', body: { text: 'Prefer concise answers.' } },
    { url: 'http://localhost:4104/gateway/documents/agent-two%3AAGENT', body: { text: 'Research requested topics.' } },
  ]);
});

test('authenticated event stream handles split frames, reconnects, and stops on cleanup', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = globalThis.XMLHttpRequest;
  class FakeXHR {
    static instances: FakeXHR[] = [];
    status = 200; responseText = ''; headers: Record<string, string> = {}; aborted = false;
    onprogress?: () => void; onload?: () => void; onerror?: () => void; ontimeout?: () => void;
    constructor() { FakeXHR.instances.push(this); }
    open(method: string, url: string) { assert.equal(method, 'GET'); assert.equal(url, 'http://localhost:4104/gateway/chat/events'); }
    setRequestHeader(name: string, value: string) { this.headers[name] = value; }
    send() {}
    abort() { this.aborted = true; }
    append(text: string) { this.responseText += text; this.onprogress?.(); }
  }
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  try {
    const client = new GatewayClient('http://localhost:4104', memoryStorage());
    await client.accept(session());
    const updates: unknown[] = [];
    const stop = client.stream('/gateway/chat/events', value => updates.push(value), error => { throw error; });
    const first = FakeXHR.instances[0]!;
    assert.equal(first.headers.Authorization, 'Bearer access');
    first.append(': heartbeat\n\ndata: [{"text":"hel');
    assert.deepEqual(updates, []);
    first.append('lo"}]\n\ndata: [{"text":"second"}]\n\n');
    assert.deepEqual(updates, [[{ text: 'hello' }], [{ text: 'second' }]]);
    first.onerror?.(); t.mock.timers.tick(500);
    assert.equal(FakeXHR.instances.length, 2);
    const second = FakeXHR.instances[1]!;
    stop(); assert.equal(second.aborted, true);
    second.append('data: []\n\n');
    assert.equal(updates.length, 2);
    t.mock.timers.tick(10000); assert.equal(FakeXHR.instances.length, 2);
  } finally { globalThis.XMLHttpRequest = original; }
});

test('stop cancels local delivery, rejects its waiter, and discards late cards', async t => {
  const posted = deferred<void>();
  let push!: (value: import('../src/data/types').MobileData['conversations']) => void;
  const requests: string[] = [];
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async input => {
    const url = String(input); requests.push(url);
    if (url.endsWith('/gateway/messages')) { posted.resolve(); return json({ id: 'message', status: 'running', conversationId: 'thread' }); }
    if (url.endsWith('/gateway/messages/cancel')) return json({ cardIds: ['late'] });
    return json({ snapshot: { tasks: [], findings: [{ id: 'late', submissionId: 'stop-id' }, { id: 'other', submissionId: 'unrelated' }] }, conversations: [] });
  }) as typeof fetch);
  await client.accept(session());
  t.mock.method(client, 'stream', (_path: string, callback: typeof push) => { push = callback; return () => {}; });
  const source = createRemoteSource(client, () => 'stop-id');
  source.subscribeChat!(() => {});
  const request = { text: 'Summarise emails', findingId: null };
  const accepted = deferred<void>();
  const sending = source.sendMessage(request, () => accepted.resolve());
  const rejected = assert.rejects(sending, /cancelled/);
  await posted.promise; await accepted.promise;
  assert.deepEqual((await source.cancelMessage!(request)).cardIds, []);
  await rejected;
  push([{ id: 'thread', findingId: null, messages: [{ id: 'message', text: request.text, status: 'completed', reply: { text: 'Late response' } }] }]);
  assert.deepEqual((await source.loadMobile!()).snapshot.findings.map(card => card.id), ['other']);
  assert.equal(requests.filter(url => url.endsWith('/gateway/messages/cancel')).length, 0);
  source.dispose!();
});

test('stop before submission acknowledgement aborts the POST and sends the same submission key', async () => {
  const entered = deferred<void>();
  let postSignal: AbortSignal | undefined;
  const client = new GatewayClient('http://localhost:4104', memoryStorage(), (async (input, init) => {
    const body = JSON.parse(init!.body as string);
    assert.equal(body.idempotencyKey, 'before-ack');
    if (String(input).endsWith('/cancel')) return json({ cardIds: [] });
    postSignal = init!.signal!; entered.resolve();
    return new Promise<Response>((_resolve, reject) => postSignal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  }) as typeof fetch);
  await client.accept(session());
  const source = createRemoteSource(client, () => 'before-ack');
  const request = { text: 'Please work', findingId: null };
  const sending = source.sendMessage(request);
  const rejected = assert.rejects(sending);
  await entered.promise;
  await source.cancelMessage!(request);
  assert.equal(postSignal!.aborted, true);
  await rejected;
  source.dispose!();
});
