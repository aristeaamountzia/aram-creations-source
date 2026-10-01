import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaFilename, mediaLocation } from './media-path';
test('only the project buckets and known media hosts can be accessed', () => {
  assert.equal(mediaLocation('https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/jewelry%2Fa.gif?alt=media&token=example').object, 'jewelry/a.gif');
  for (const url of ['http://127.0.0.1/private', 'https://example.com/photo.jpg', 'https://firebasestorage.googleapis.com/v0/b/other/o/file', 'https://storage.googleapis.com/other/a', 'https://images1.vinted.net.evil.com/file', 'https://user:pass@images1.vinted.net/file']) assert.throws(() => mediaLocation(url));
});
test('download filenames keep GIF/video extensions and remove unsafe characters', () => {
  assert.equal(mediaFilename('product.jpg', 'image/gif'), 'product.gif');
  assert.equal(mediaFilename('video', 'video/mp4'), 'video.mp4');
  assert.equal(mediaFilename('a/../b\r\n.jpg', 'image/jpeg').includes('\n'), false);
});

