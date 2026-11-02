import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdersHandler } from '../netlify/functions/orders';

const mockDb = {
  collection: () => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }),
  doc: () => ({ get: async () => ({ exists: false }) }),
  runTransaction: async () => {}
};
const mockAuth = {
  verifyIdToken: async (token: string) =>
    token === 'valid-admin' ? { uid: 'admin-1', admin: true } :
    token === 'email-admin' ? { uid: 'admin-2', email: 'customadmin@example.com' } : null
};

test('OPTIONS request returns 204 with CORS headers for allowed origin', async () => {
  const handler = createOrdersHandler(() => ({ db: mockDb as any, auth: mockAuth as any }), async () => 'test');
  const req = new Request('http://localhost/api/orders', {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://aramcreationss.netlify.app' }
  });
  const res = await handler(req, { ip: '127.0.0.1' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://aramcreationss.netlify.app');
  assert.ok(res.headers.get('Access-Control-Allow-Methods')?.includes('POST'));
});

test('POST with primary production origin passes origin validation and reaches body parser', async () => {
  const handler = createOrdersHandler(() => ({ db: mockDb as any, auth: mockAuth as any }), async () => 'test');
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'Origin': 'https://aramcreationss.netlify.app',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ping: true })
  });
  const res = await handler(req, { ip: '127.0.0.1' });
  // Should NOT be 403 Forbidden! It should reach body validation and return 400 Bad Request
  assert.notEqual(res.status, 403);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://aramcreationss.netlify.app');
});

test('POST with unauthorized origin is rejected with 403', async () => {
  const handler = createOrdersHandler(() => ({ db: mockDb as any, auth: mockAuth as any }), async () => 'test');
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'Origin': 'https://unauthorized-attacker.example.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ping: true })
  });
  const res = await handler(req, { ip: '127.0.0.1' });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'Μη επιτρεπόμενη προέλευση.');
});

test('Admin check accepts ADMIN_EMAIL environment override', async () => {
  process.env.ADMIN_EMAIL = 'customadmin@example.com';
  const handler = createOrdersHandler(() => ({ db: mockDb as any, auth: mockAuth as any }), async () => 'test');
  const req = new Request('http://localhost/api/orders', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer email-admin' }
  });
  const res = await handler(req, { ip: '127.0.0.1' });
  assert.equal(res.status, 200);
});

