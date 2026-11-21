import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import handler, { verifyStripeSignature } from '../netlify/functions/stripe-webhook';

test('Stripe webhook signature requires a valid recent signature', () => {
  const payload = JSON.stringify({ id: 'evt_test' });
  const secret = 'whsec_test';
  const now = 1_800_000_000_000;
  const timestamp = String(now / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(verifyStripeSignature(payload, header, secret, now), true);
  assert.equal(verifyStripeSignature(payload + 'x', header, secret, now), false);
  assert.equal(verifyStripeSignature(payload, header, secret, now + 301_000), false);
  assert.equal(verifyStripeSignature(payload, '', secret, now), false);
});

test('Stripe webhook accepts a valid signature during signing-secret rotation', () => {
  const payload = JSON.stringify({ id: 'evt_rotation' });
  const now = 1_800_000_000_000;
  const timestamp = String(now / 1000);
  const sign = (secret: string) => createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  const header = 't=' + timestamp + ', v1=' + sign('whsec_previous') + ', v1=' + sign('whsec_current');
  assert.equal(verifyStripeSignature(payload, header, 'whsec_current', now), true);
  assert.equal(verifyStripeSignature(payload, header, 'whsec_unrelated', now), false);
});

test('a delayed failure cannot release stock after Stripe reports the session paid', async context => {
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousApiKey = process.env.STRIPE_SECRET_KEY;
  const secret = 'whsec_fixture';
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  context.after(() => {
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
    if (previousApiKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousApiKey;
  });

  const stripeLookup = context.mock.method(globalThis, 'fetch', async () => Response.json({
    id: 'cs_fixture', payment_status: 'paid', status: 'complete',
  }));
  const payload = JSON.stringify({
    type: 'checkout.session.async_payment_failed',
    data: { object: { id: 'cs_fixture', client_reference_id: 'order-1' } },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  const response = await handler(new Request('https://example.invalid/api/stripe-webhook', {
    method: 'POST', body: payload,
    headers: { 'stripe-signature': 't=' + timestamp + ',v1=' + signature },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, ignored: true });
  assert.equal(stripeLookup.mock.callCount(), 1);
});
