import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketplaceClient, publishedVersion, setupLabel, type MarketDetail } from '../src/data/marketplace';
import { cardRelease } from '../src/data/card-gesture';

function fixture() {
  const calls: { path: string; init?: RequestInit }[] = [];
  const client = createMarketplaceClient({ async request<T>(path: string, init?: RequestInit) { calls.push({ path, init }); return {} as T; } });
  return { client, calls };
}

test('catalog search encodes input and uses backend ordering and pagination', async () => {
  const { client, calls } = fixture();
  await client.catalog('top', 'mail & calendar/notes', 20);
  const url = new URL(calls[0].path, 'http://localhost');
  assert.equal(url.pathname, '/gateway/marketplace');
  assert.equal(url.searchParams.get('sort'), 'top');
  assert.equal(url.searchParams.get('q'), 'mail & calendar/notes');
  assert.equal(url.searchParams.get('offset'), '20');
  await client.catalog('featured');
  assert.equal(new URL(calls[1].path, 'http://localhost').searchParams.get('sort'), 'featured');
});

test('publication saves only public fields and publishes the reviewed version', async () => {
  const { client, calls } = fixture();
  await client.createDraft('source');
  await client.saveDraft('listing', { name: 'Helper', description: 'Helps', artwork: { asset: 'flight' }, instructions: 'Be useful.', requiredTools: ['reply_chat', 'create_home_card'] });
  await client.publish('listing', 'draft-v2');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { agentId: 'source' });
  const draft = JSON.parse(String(calls[1].init?.body));
  assert.equal(draft.artwork.asset, 'flight');
  assert.deepEqual(Object.keys(draft).sort(), ['artwork', 'description', 'instructions', 'name', 'requiredTools']);
  assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { versionId: 'draft-v2' });
  assert.equal(calls[2].path, '/gateway/marketplace/listing/publish');
});

test('installation and explicit updates send consent with the selected release', async () => {
  const { client, calls } = fixture();
  const tools = ['reply_chat', 'create_home_card', 'gmail_read'];
  await client.install('listing', tools, 'Only unread mail');
  await client.enable('installation', true);
  await client.update('installation', 'v2', tools);
  await client.uninstall('installation');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { acceptedTools: tools, preferences: 'Only unread mail' });
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { enabled: true });
  assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { versionId: 'v2', acceptedTools: tools });
  assert.equal(calls[2].path, '/gateway/marketplace/installations/installation/update');
  assert.equal(calls[3].init?.method, 'DELETE');
  assert.equal(calls[3].init?.body, undefined);
});

test('latest release pointer controls installation rather than response array order', () => {
  const version = { id: 'v2' };
  assert.equal(publishedVersion({ listing: { latest_published_version_id: 'v2' }, versions: [{ id: 'v1' }, version] } as MarketDetail), version);
  assert.equal(publishedVersion({ listing: { latest_published_version_id: 'missing' }, versions: [version] } as MarketDetail), undefined);
});

test('server permission and connection failures receive useful setup labels', () => {
  assert.equal(setupLabel('permission:gmail_read'), 'Allow Read Gmail');
  assert.equal(setupLabel('connection:gmail_read'), 'Connect Gmail with read access');
  assert.equal(setupLabel('connection:calendar_create'), 'Connect Google Calendar and Tasks');
});

test('short drags snap back; full drags and intentional flicks fly past either edge', () => {
  assert.equal(cardRelease(22, 0, 0.2, 340).dismiss, false);
  assert.equal(cardRelease(5, 0, 2, 340).dismiss, false);
  assert.equal(cardRelease(35, 0, 1, 340).dismiss, true);
  const left = cardRelease(-150, 250, -0.3, 340);
  assert.equal(left.dismiss, true); assert.ok(left.x < -340); assert.equal(left.y, 100);
  const right = cardRelease(150, -250, 0.3, 340);
  assert.equal(right.dismiss, true); assert.ok(right.x > 340); assert.equal(right.y, -100);
});

test('API failures are propagated for inline handling', async () => {
  const failure = new Error('Connection required');
  const client = createMarketplaceClient({ async request() { throw failure; } });
  await assert.rejects(client.install('listing', [], ''), error => error === failure);
});

test('publishing accepts exactly the backend artwork keys and rejects unsupported sticker payloads', async () => {
  const { marketplaceArtworkOptions, isMarketplaceArtwork } = await import('../src/data/marketplace');
  assert.deepEqual(marketplaceArtworkOptions.map(item => item.asset).sort(), ['brief', 'calendar', 'flight', 'gym', 'mail', 'video']);
  for (const option of marketplaceArtworkOptions) assert.equal(isMarketplaceArtwork({ asset: option.asset }), true);
  assert.equal(isMarketplaceArtwork({ asset: 'sticker-robot' }), false);
  assert.equal(isMarketplaceArtwork({ asset: 'flight', uri: 'https://example.invalid/image.png' }), false);
  const { client, calls } = fixture();
  await assert.rejects(client.saveDraft('listing', { name: 'Agent', description: '', instructions: 'Help', requiredTools: [], artwork: { asset: 'sticker-robot' } } as unknown as import('../src/data/marketplace').DraftChanges), /supported publishing artworks/);
  assert.equal(calls.length, 0, 'unsupported artwork is rejected before submitting a request');
});

test('carousel uses only the saved publishing choice, with no invented cover for unmatched assets', async () => {
  const { carouselTheme } = await import('../src/data/carousel-theme');
  assert.equal(carouselTheme({ artwork: { asset: 'flight' } }), 'airplane');
  assert.equal(carouselTheme({ artwork: { asset: 'calendar' } }), 'calendar');
  assert.equal(carouselTheme({ artwork: { asset: 'brief' } }), 'document');
  assert.equal(carouselTheme({ artwork: { asset: 'video' } }), 'video');
  assert.equal(carouselTheme({ artwork: { asset: 'mail' } }), undefined);
  assert.equal(carouselTheme({ artwork: { asset: 'gym' } }), undefined);
});

test('publishing artwork choices match the completed backend allowlist', { skip: !process.env.AVOCADO_MARKETPLACE_BACKEND_FILE }, async () => {
  const { readFile } = await import('node:fs/promises');
  const { marketplaceArtworkOptions } = await import('../src/data/marketplace');
  const source = await readFile(process.env.AVOCADO_MARKETPLACE_BACKEND_FILE!, 'utf8');
  const match = source.match(/const assets = new Set\(\[([^\]]*)\]\)/);
  assert.ok(match, 'backend declares its accepted artwork assets');
  const serverKeys = [...match[1].matchAll(/'([^']+)'/g)].map(value => value[1]).sort();
  assert.deepEqual(marketplaceArtworkOptions.map(item => item.asset).sort(), serverKeys);
});
