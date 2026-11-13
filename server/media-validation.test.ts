import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMediaSignature, IMAGE_UPLOAD_LIMIT, validateMediaFile } from '../src/lib/media-validation';

test('automatic upload detection enforces the image size limit', async () => {
  const oversized = new Blob([new Uint8Array([0xff, 0xd8, 0xff]), new Uint8Array(IMAGE_UPLOAD_LIMIT)]);
  await assert.rejects(() => validateMediaFile(oversized), /30 MB/);
});

const file = (bytes: number[], type: string, name: string) => Object.assign(new Blob([new Uint8Array(bytes)], { type }), { name });

test('detects JPEG, PNG, WebP and MP4 by binary signature', () => {
  assert.equal(detectMediaSignature(new Uint8Array([0xff, 0xd8, 0xff]))?.mime, 'image/jpeg');
  assert.equal(detectMediaSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]))?.mime, 'image/png');
  assert.equal(detectMediaSignature(new Uint8Array([...Buffer.from('RIFF0000WEBP')]))?.mime, 'image/webp');
  assert.equal(detectMediaSignature(new Uint8Array([...Buffer.from('0000ftypisom')]))?.mime, 'video/mp4');
});

test('rejects corrupted images and MIME/content mismatches', async () => {
  await assert.rejects(() => validateMediaFile(file([...Buffer.from('not an image')], 'image/jpeg', 'broken.jpg'), 'image'));
  await assert.rejects(() => validateMediaFile(file([0xff, 0xd8, 0xff, 0x00], 'video/mp4', 'fake.mp4'), 'video'));
});

test('accepts valid content when browser omits MIME type', async () => {
  const detected = await validateMediaFile(file([0xff, 0xd8, 0xff, 0x00], '', 'camera.jpg'), 'image');
  assert.equal(detected.mime, 'image/jpeg');
});
