import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMediaSignature, IMAGE_UPLOAD_LIMIT, shouldFetchStoredMediaBytes, validateMediaFile } from '../src/lib/media-validation';

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

test('does not require CORS Range fetches for cross-origin Firebase media URLs', () => {
  assert.equal(shouldFetchStoredMediaBytes('https://firebasestorage.googleapis.com/v0/b/example/o/image.jpg?token=redacted', 'https://aramcreationsofficial.netlify.app'), false);
  assert.equal(shouldFetchStoredMediaBytes('https://aramcreationsofficial.netlify.app/media/image.jpg', 'https://aramcreationsofficial.netlify.app'), true);
  assert.equal(shouldFetchStoredMediaBytes('http://localhost:9199/v0/b/example/o/image.jpg', 'http://localhost:5173'), true);
});

test('HEIC and HEIF brands are images rather than misclassified MP4 videos', async () => {
  for (const brand of ['heic', 'heix', 'mif1', 'msf1']) {
    const source = file([...Buffer.from(`0000ftyp${brand}0000${brand}`)], 'image/heic', `photo.${brand}`);
    assert.deepEqual(await validateMediaFile(source, 'image'), { kind: 'image', mime: 'image/heif' });
  }
  assert.equal(detectMediaSignature(Buffer.from('0000ftypavif'))?.mime, 'image/avif');
});

test('recognizes common camera, design and legacy image signatures without trusting extensions', async () => {
  const examples = [
    [Buffer.from('BM000000'), 'image/bmp'], [Buffer.from('II*\x00'), 'image/tiff'],
    [Buffer.from('MM\x00*'), 'image/tiff'], [Buffer.from([0, 0, 1, 0]), 'image/x-icon'],
    [Buffer.from('8BPS0000'), 'image/vnd.adobe.photoshop'],
    [Buffer.from('0000jP  \r\n\x87\n', 'binary'), 'image/jp2'],
    [Buffer.from('\uFEFF<?xml version="1.0"?>\n<!-- artist --><svg xmlns="http://www.w3.org/2000/svg">'), 'image/svg+xml'],
  ] as const;
  for (const [bytes, mime] of examples) assert.equal(detectMediaSignature(bytes)?.mime, mime);
  await assert.rejects(() => validateMediaFile(file([...Buffer.from('<html><svg>not a standalone image</svg></html>')], 'image/svg+xml', 'fake.svg')));
});

test('recognizes MKV, WebM, MPEG transport streams and FLV by content', () => {
  const ebml = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
  assert.equal(detectMediaSignature(Buffer.concat([ebml, Buffer.from('matroska')]))?.mime, 'video/x-matroska');
  assert.equal(detectMediaSignature(Buffer.concat([ebml, Buffer.from('webm')]))?.mime, 'video/webm');
  assert.equal(detectMediaSignature(Buffer.from('FLV\x01'))?.mime, 'video/x-flv');
  const ts = new Uint8Array(400); ts[0] = ts[188] = 0x47;
  assert.equal(detectMediaSignature(ts)?.mime, 'video/mp2t');
  assert.equal(detectMediaSignature(Buffer.from([0,0,1,0xba]))?.mime, 'video/mpeg');
});
