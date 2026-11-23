import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAiImages } from '../src/lib/ai-images';
import { loadMediaImage } from '../src/lib/media-files';
import { auth } from '../src/firebase';

test('AI reads stored Firebase images through the authenticated same-origin endpoint', async t => {
  for (const [target, key, value] of [
    [auth, 'currentUser', { getIdToken: async () => 'test-token' }],
    [globalThis, 'Image', class { src = ''; async decode() {} }],
  ] as const) {
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { configurable: true, value });
    t.after(() => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key));
  }
  const url = 'https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/jewelry%2Fvinted-imports%2Fsample.jpg';
  const fetch = t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    assert.equal(input, '/api/media');
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token');
    assert.equal(JSON.parse(String(init.body)).action, 'read');
    return new Response(new Blob(['fixture'], { type: 'image/jpeg' }));
  });
  const image = await loadMediaImage({ url });
  image.cleanup();
  assert.equal(fetch.mock.callCount(), 1);
});

test('AI image preparation reports a failed image instead of silently sending text only', async () => {
  await assert.rejects(prepareAiImages([{ url: 'image' }], async () => { throw new Error('HTTP 403'); }), /εικόνα 1.*HTTP 403/);
});

test('AI images skip videos, resize the same way and release resources', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'document', original); else delete (globalThis as any).document; });
  const canvas = { width: 0, height: 0, getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,fixture' };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  let loaded = 0; let cleaned = 0;
  const result = await prepareAiImages([{ url: 'video', type: 'video' }, ...[1, 2, 3, 4].map(n => ({ url: String(n), type: 'image' }))], async () => {
    loaded++;
    return { img: { width: 1536, height: 768 } as HTMLImageElement, cleanup: () => { cleaned++; } };
  });
  assert.equal(result.length, 3);
  assert.equal(loaded, 3); assert.equal(cleaned, 3);
  assert.equal(canvas.width, 768); assert.equal(canvas.height, 384);
  canvas.getContext = () => null as any;
  await assert.rejects(prepareAiImages([{ url: 'image' }], async () => ({ img: { width: 50, height: 50 } as HTMLImageElement, cleanup: () => { cleaned++; } })), /canvas/);
  assert.equal(cleaned, 4);
});
