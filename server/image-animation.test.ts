import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnimatedImage } from '../src/lib/image-upload';

test('keeps GIF, APNG, animated WebP and animated AVIF instead of flattening them', async () => {
  assert.equal(await isAnimatedImage(new Blob(['GIF89a']), 'image/gif'), true);
  const chunk = (type: string, data: Uint8Array, png: boolean) => {
    const header = Buffer.alloc(8); header.write(type, png ? 4 : 0);
    if (png) header.writeUInt32BE(data.length, 0); else header.writeUInt32LE(data.length, 4);
    return Buffer.concat([header, data, Buffer.alloc(png ? 4 : data.length % 2)]);
  };
  const png = new Blob([Buffer.alloc(8), chunk('IHDR', Buffer.alloc(13), true), chunk('acTL', Buffer.alloc(8), true)]);
  assert.equal(await isAnimatedImage(png, 'image/png'), true);
  const webp = new Blob(['RIFF0000WEBP', chunk('VP8X', Buffer.alloc(10), false), chunk('ANIM', Buffer.alloc(6), false)]);
  assert.equal(await isAnimatedImage(webp, 'image/webp'), true);
  assert.equal(await isAnimatedImage(new Blob(['0000ftypavis0000avif']), 'image/avif'), true);
  assert.equal(await isAnimatedImage(new Blob(['0000ftypavif']), 'image/avif'), false);
});
