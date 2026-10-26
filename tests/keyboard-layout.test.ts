import assert from 'node:assert/strict';
import test from 'node:test';
import { keyboardComposerTop } from '../src/keyboardLayout';

test('composer stays 8px above the keyboard across keyboard sizes and window offsets', () => {
  for (const hostTop of [0, 24, 44]) {
    for (const keyboardTop of [400, 520, 650]) {
      const top = keyboardComposerTop({ keyboardTop, hostTop, hostHeight: 780, composerHeight: 52, gap: 8 });
      assert.equal(keyboardTop - (hostTop + top + 52), 8);
    }
  }
});

test('a keyboard outside Home does not push the composer below its normal position', () => {
  assert.equal(keyboardComposerTop({ keyboardTop: 900, hostTop: 0, hostHeight: 780, composerHeight: 52, gap: 8 }), 728);
});

test('the composer stays on screen when the keyboard reaches the top of the host', () => {
  assert.equal(keyboardComposerTop({ keyboardTop: 50, hostTop: 24, hostHeight: 780, composerHeight: 52, gap: 8 }), 0);
});
