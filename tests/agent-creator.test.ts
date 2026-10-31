import assert from 'node:assert/strict';
import test from 'node:test';
import { agentMarkdownError, agentTemplate } from '../src/data/agent-creator';
import { squareCrop, clampCropOffset, resizedSquare } from '../src/data/image-crop';

test('creator template contains selected tool guidance and requires an agent name heading', () => {
  assert.match(agentTemplate(['gmail', 'tasks']), /gmail_search/);
  assert.match(agentTemplate(['gmail', 'tasks']), /task_create/);
  assert.equal(agentMarkdownError('# Inbox helper\n\nKeep my inbox tidy.'), null);
  assert.ok(agentMarkdownError('A description without a name'));
  assert.ok(agentMarkdownError('# '));
  assert.ok(agentMarkdownError('# ' + 'x'.repeat(201)));
});
test('square crops stay within portrait and landscape photos after large drags and zooms', () => {
  for (const [width, height] of [[1800, 900], [900, 1800]]) {
    const offset = clampCropOffset(width, height, 300, 2, 10000, -10000);
    const crop = squareCrop(width, height, 300, 2, offset.x, offset.y);
    assert.equal(crop.width, crop.height);
    assert.ok(crop.originX >= 0 && crop.originY >= 0);
    assert.ok(crop.originX + crop.width <= width && crop.originY + crop.height <= height);
  }
  assert.equal(resizedSquare(90, 'icon'), 90, 'small sources are never upscaled');
  assert.equal(resizedSquare(1500, 'icon'), 256);
  assert.equal(resizedSquare(1500, 'cover'), 800);
});
