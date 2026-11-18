import assert from 'node:assert/strict';
import test from 'node:test';
import handleRequest from '../netlify/functions/api';

const context = { requestId: 'api-regression', ip: '127.0.0.1' } as Parameters<typeof handleRequest>[1];
const request = (path: string, init?: RequestInit) => handleRequest(new Request(`https://aramcreationsofficial.netlify.app${path}`, init), context);

test('modern API handler preserves the health route and HEAD semantics', async () => {
  const response = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).firebaseProject, 'aramcreations-e1529');
  const head = await request('/api/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('modern API handler preserves preflight response headers', async () => {
  const response = await request('/api/image-proxy', { method: 'OPTIONS' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-headers') || '', /Authorization/);
});

test('modern API handler preserves URL query validation', async () => {
  const response = await request('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.png');
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Only Vinted listing images/);
});

test('modern API handler preserves exact binary image responses', async () => {
  const originalFetch = globalThis.fetch;
  const bytes = Uint8Array.of(137, 80, 78, 71, 0, 255, 128, 13, 10);
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.equal(String(input), 'https://images1.vinted.net/regression.png');
    return new Response(bytes, { headers: { 'content-type': 'image/png' } });
  }) as typeof fetch;
  try {
    const response = await request('/api/image-proxy?url=https%3A%2F%2Fimages1.vinted.net%2Fregression.png');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('modern API handler rejects an unauthenticated binary upload before conversion', async () => {
  const response = await request('/api/video-transcode', {
    method: 'POST', headers: { 'content-type': 'video/mp4' }, body: Uint8Array.of(0, 255, 128),
  });
  assert.equal(response.status, 401);
});
