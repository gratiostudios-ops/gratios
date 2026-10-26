import assert from 'node:assert/strict';
import test from 'node:test';
import { bottomTabHeight } from '../src/theme';

test('bottom navigation leaves room for its controls and device safe area', () => {
  for (const inset of [0, 7, 24, 34, 48]) {
    const usableHeight = bottomTabHeight(inset) - Math.max(7, inset) - 7;
    assert.ok(usableHeight >= 44 + 26, `tabs and contact line overflow with a ${inset}px inset`);
  }
  assert.equal(bottomTabHeight(0), 88);
});
