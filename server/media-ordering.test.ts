import test from 'node:test';
import assert from 'node:assert/strict';
import { moveMediaItem } from '../src/components/media/useMediaOrdering';

test('media ordering moves an item without dropping or duplicating entries', () => {
  const source = ['cover', 'detail', 'video', 'back'];
  assert.deepEqual(moveMediaItem(source, 2, 0), ['video', 'cover', 'detail', 'back']);
  assert.deepEqual(source, ['cover', 'detail', 'video', 'back']);
});

test('media ordering keeps a stable copy for no-op and invalid moves', () => {
  const source = ['cover', 'detail'];
  const same = moveMediaItem(source, 0, 0);
  const invalid = moveMediaItem(source, -1, 1);
  assert.deepEqual(same, source);
  assert.deepEqual(invalid, source);
  assert.notEqual(same, source);
  assert.notEqual(invalid, source);
});
