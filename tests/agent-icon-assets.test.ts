import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

// Validate real asset pixels: empty/opaque crops and cut-off edges must not ship.
test('all 35 sticker crops are named RGBA assets with transparent margins and visible content', async () => {
  const directory = new URL('../assets/agent-icons/', import.meta.url);
  const names = (await readdir(directory)).filter(name => name.endsWith('.png'));
  assert.equal(names.length, 35);
  const manifest = await readFile(new URL('../src/agent-icons.ts', import.meta.url), 'utf8');
  for (const name of names) {
    assert.ok(manifest.includes('../assets/agent-icons/' + name), name + ' is registered');
    const bytes = await readFile(new URL(name, directory));
    assert.equal(bytes.readUInt32BE(16), 256, name);
    assert.equal(bytes.readUInt32BE(20), 256, name);
    assert.equal(bytes[25], 6, name + ' has RGBA pixels');
    let offset = 8; const compressed: Buffer[] = [];
    while (offset < bytes.length) { const length = bytes.readUInt32BE(offset); if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') compressed.push(bytes.subarray(offset + 8, offset + 8 + length)); offset += length + 12; }
    const raw = inflateSync(Buffer.concat(compressed));
    assert.ok(raw.length > 256 * 256 * 4, name + ' contains full pixels');
    // The PNG filter byte varies; decode each scanline to inspect actual alpha.
    const decoded = Buffer.alloc(256 * 256 * 4); const stride = 256 * 4;
    const paeth = (a: number, b: number, c: number) => { const p = a + b - c; const x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c; };
    for (let y = 0; y < 256; y++) for (let x = 0; x < stride; x++) {
      const at = y * stride + x, filter = raw[y * (stride + 1)];
      const left = x >= 4 ? decoded[at - 4] : 0, up = y ? decoded[at - stride] : 0, upperLeft = y && x >= 4 ? decoded[at - stride - 4] : 0;
      const prediction = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0;
      decoded[at] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255;
    }
    let visible = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const alpha = decoded[(y * 256 + x) * 4 + 3]; if (alpha) visible++; if (x < 8 || x > 247 || y < 8 || y > 247) assert.equal(alpha, 0, name + ' has a clear margin'); }
    assert.ok(visible > 3000, name + ' is not an empty crop');
    assert.ok(visible < 55000, name + ' does not retain an opaque checkerboard');
  }
});
