import test from 'node:test';
import assert from 'node:assert/strict';
import { createStripeCheckoutSession } from './stripe-service';

test('createStripeCheckoutSession throws if STRIPE_SECRET_KEY is missing', async () => {
  const oldKey = process.env.STRIPE_SECRET_KEY;
  try {
    delete process.env.STRIPE_SECRET_KEY;
    await assert.rejects(
      async () => {
        await createStripeCheckoutSession({
          orderId: 'test-order-id',
          orderNumber: 'ARAM-TEST',
          items: [{ name: 'Δαχτυλίδι', price: 25, quantity: 1 }],
          shippingMethod: 'boxnow',
          shippingCost: 2.5,
          customerEmail: 'test@example.com',
          origin: 'https://aramcreationsofficial1.netlify.app'
        });
      },
      { message: /απαιτείται κλειδί API/ }
    );
  } finally {
    if (oldKey) process.env.STRIPE_SECRET_KEY = oldKey;
  }
});

