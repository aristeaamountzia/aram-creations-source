import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapLocalWebHandler } from './production-bridge';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    send(body: unknown) { this.body = body; return this; },
    setHeader(key: string, value: string) { this.headers[key] = value; return this; },
  };
}

function requestFixture() {
  return {
    method: 'POST',
    protocol: 'http',
    originalUrl: '/api/orders',
    body: { requestId: 'CODEX TEST' },
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
    ip: '127.0.0.1',
    get(name: string) { return name.toLowerCase() === 'host' ? 'localhost:3000' : this.headers[name.toLowerCase() as keyof typeof this.headers]; },
  };
}

test('missing local configuration fails closed without contacting production', async () => {
  const key = 'CODEX_TEST_LOCAL_BACKEND_SECRET';
  const previous = process.env[key];
  delete process.env[key];
  const originalFetch = globalThis.fetch;
  let externalFetchCalled = false;
  globalThis.fetch = (async () => {
    externalFetchCalled = true;
    throw new Error('network must not be used');
  }) as typeof fetch;
  let localHandlerCalled = false;
  const handler = wrapLocalWebHandler(async () => {
    localHandlerCalled = true;
    return Response.json({ ok: true });
  }, [key]);
  const res = responseRecorder();

  try {
    await handler(requestFixture() as any, res as any);
    assert.equal(res.statusCode, 503);
    assert.equal((res.body as any).code, 'LOCAL_BACKEND_NOT_CONFIGURED');
    assert.deepEqual((res.body as any).missing, [key]);
    assert.equal(localHandlerCalled, false);
    assert.equal(externalFetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

test('configured local requests execute only the supplied local handler', async () => {
  const key = 'CODEX_TEST_LOCAL_BACKEND_SECRET';
  const previous = process.env[key];
  process.env[key] = 'configured-for-test';
  let receivedUrl = '';
  const handler = wrapLocalWebHandler(async request => {
    receivedUrl = request.url;
    return Response.json({ local: true }, { status: 201 });
  }, [key]);
  const res = responseRecorder();

  try {
    await handler(requestFixture() as any, res as any);
    assert.equal(res.statusCode, 201);
    assert.equal(receivedUrl, 'http://localhost:3000/api/orders');
    assert.deepEqual(JSON.parse(Buffer.from(res.body as any).toString('utf8')), { local: true });
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});
