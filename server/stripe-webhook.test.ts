import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from '../netlify/functions/stripe-webhook';

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
