import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import handler from '../netlify/functions/media';

const path = process.env.ORDER_TEST_CREDENTIAL_PATH;
if (!path) throw new Error('Set local credential path.');
process.env.FIREBASE_SERVICE_ACCOUNT = readFileSync(path, 'utf8');
const app = initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }, 'media-integration');
const bucket = getStorage(app).bucket('aramcreations-e1529.firebasestorage.app');
const fixture = bucket.file(`jewelry/test-${randomUUID()}/download.gif`);
const base = process.env.MEDIA_TEST_BASE_URL;
const call = async (body: any, token = '') => {
  const request = new Request(`${base || 'https://local.test'}/api/media`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  return base ? fetch(request) : handler(request);
};
const urlFor = (name: string) => `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(name)}?alt=media`;
try {
  assert.equal((await call({})).status, 401);
  const user = await getAuth(app).getUserByEmail('aristeaamnta@gmail.com');
  const customToken = await getAuth(app).createCustomToken(user.uid);
  const authResponse = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyCbOy-d0naXBGw6TR-2dGS5Wb4IEkZYDKU', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(30000) });
  const authData = await authResponse.json();
  if (!authResponse.ok || !authData.idToken) throw new Error('Test authentication failed.');
  const token = authData.idToken;
  assert.equal((await call({ action: 'download', url: 'https://storage.googleapis.com/other/file' }, token)).status, 400);
  let image: string | undefined, video: string | undefined, query: any = { prefix: 'jewelry/', maxResults: 300, autoPaginate: false };
  while ((!image || !video) && query) {
    const [files, next] = await bucket.getFiles(query);
    for (const file of files) {
      if (!image && /^image\/(jpeg|png|webp)$/.test(String(file.metadata.contentType))) image = file.name;
      if (!video && /^video\//.test(String(file.metadata.contentType))) video = file.name;
    }
    query = next;
  }
  assert.ok(image, 'An existing uploaded image is required.');
  assert.ok(video, 'An existing uploaded video is required.');
  const edited = await call({ action: 'edit', url: urlFor(image) }, token);
  assert.equal(edited.status, 200, 'Existing image must be readable for the canvas editor.');
  assert.match(edited.headers.get('content-type') || '', /^image\//);
  assert.ok((await edited.arrayBuffer()).byteLength > 100);
  console.log('PASS: authenticated editor access to an existing uploaded image.');
  // A tiny two-frame GIF proves that downloads preserve the original bytes.
  const gif = Buffer.from('47494638396101000100800000000000ffffff21ff0b4e45545343415045322e30030100000021f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024c01003b', 'hex');
  await fixture.save(gif, { resumable: false, metadata: { contentType: 'image/gif' } });
  for (const [name, type] of [[image, 'image/'], [video, 'video/'], [fixture.name, 'image/gif']]) {
    const response = await call({ action: 'download', url: urlFor(name), filename: 'aram-download' }, token);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.url && data.filename);
    const download = await fetch(data.url, { signal: AbortSignal.timeout(30000) });
    assert.equal(download.status, 200);
    assert.ok(download.headers.get('content-type')?.startsWith(type));
    assert.match(download.headers.get('content-disposition') || '', /^attachment;/);
    if (name === fixture.name) { assert.deepEqual(Buffer.from(await download.arrayBuffer()), gif); assert.match(data.filename, /\.gif$/); }
    else { const reader = download.body!.getReader(); assert.ok((await reader.read()).value?.byteLength); await reader.cancel(); }
  }
  assert.equal((await call({ action: 'edit', url: urlFor(fixture.name) }, token)).status, 415);
  console.log('PASS: signed image/video/GIF downloads, original GIF bytes, attachment headers and GIF editing protection.');
} finally {
  await fixture.delete({ ignoreNotFound: true });
  await Promise.all(getApps().map(app => app.delete()));
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
}

