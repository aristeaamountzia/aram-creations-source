import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaResponse, downloadMedia } from '../src/lib/media-files';
import { exportProject } from '../src/lib/project-export';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = createRequire(require.resolve('exceljs'))('jszip');
const bytes = new Uint8Array([71, 73, 70, 56, 57, 97]);

test('public media downloads work without an admin proxy or signed-URL CORS', async t => {
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: any) => {
    calls.push(String(url));
    return new Response(bytes, { headers: { 'content-type': 'image/gif' } });
  });
  assert.deepEqual(new Uint8Array(await (await mediaResponse('https://static.wixstatic.com/media/image.gif')).arrayBuffer()), bytes);
  const link = { href: '', download: '', click() {}, remove() {} };
  t.mock.method(globalThis.URL, 'createObjectURL', () => 'blob:download');
  t.mock.method(globalThis, 'setTimeout', (() => 0) as any);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => link, body: { appendChild() {} } } });
  t.after(() => { delete (globalThis as any).document; });
  await downloadMedia('https://static.wixstatic.com/media/image.gif', 'Εικόνα.jpg');
  assert.equal(link.href, 'blob:download');
  assert.equal(link.download, 'Εικόνα.gif');
  assert.ok(calls.every(url => !url.startsWith('/api/')));
});

test('ZIP includes original media bytes and Greek filenames', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers: { 'content-type': 'image/gif' } }));
  let archive: Blob | undefined;
  await exportProject({ title: 'Έργο', text: 'Περιγραφή', source: 'https://example.com', media: [{ url: 'https://static.wixstatic.com/media/image.gif', type: 'image', filename: 'Εικόνα.gif' }] }, () => {}, blob => { archive = blob; });
  const zip = await JSZip.loadAsync(await archive!.arrayBuffer());
  assert.deepEqual(await zip.file('media/001-Εικόνα.gif').async('uint8array'), bytes);
  assert.match(await zip.file('project.txt').async('string'), /Περιγραφή/);
  assert.equal(zip.file('files-not-downloaded.txt'), null);
});

test('cancellation prevents a media request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(bytes));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(mediaResponse('https://static.wixstatic.com/media/image.gif', controller.signal), { name: 'AbortError' });
  assert.equal(fetch.mock.callCount(), 0);
});

test('Excel thumbnails fall back to image decoding when bitmap decoding is unavailable', async t => {
  const { loadExcelThumbnail } = await import('../src/lib/excel-thumbnail');
  t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers: { 'content-type': 'image/gif' } }));
  const originals = new Map(['document', 'Image', 'createImageBitmap'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const install = (key: string, value: unknown) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; } });
  let drawn = false;
  install('createImageBitmap', undefined);
  install('Image', class { width = 100; height = 50; src = ''; async decode() {} });
  install('document', { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() { drawn = true; } }), toDataURL: () => 'data:image/jpeg;base64,thumbnail' }) });
  assert.deepEqual(await loadExcelThumbnail('https://static.wixstatic.com/media/image.gif'), { base64: 'data:image/jpeg;base64,thumbnail', extension: 'jpeg' });
  assert.equal(drawn, true);
});
