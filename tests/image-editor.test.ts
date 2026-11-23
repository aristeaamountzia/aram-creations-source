import assert from 'node:assert/strict';
import test from 'node:test';
import { imageCropSize } from '../src/lib/image-crop';

test('crop stays centered and uses the rotated dimensions when framing a portrait or landscape image', () => {
  assert.deepEqual(imageCropSize(1600, 900, 0, '1:1'), { width: 900, height: 900 });
  assert.deepEqual(imageCropSize(1600, 900, 90, '4:5'), { width: 900, height: 1125 });
  assert.deepEqual(imageCropSize(1600, 900, -90, 'free'), { width: 900, height: 1600 });
});
