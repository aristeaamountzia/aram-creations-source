import test from 'node:test';
import assert from 'node:assert/strict';
import { createStripeCheckoutSession } from './stripe-service';

test('Stripe uses the storefront language and preserves the same order on both return paths', async t => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'test-only-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
  });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.equal(typeof options.body, 'string');
    return Response.json({ id: 'cs_test_local', url: 'https://checkout.stripe.com/test' });
  });
  const order = {
    orderId: 'order-1', orderNumber: 'ARAM-TEST-1',
    items: [{ name: 'Test jewelry', price: 25, quantity: 2 }],
    shippingMethod: 'boxnow', shippingCost: 2.5, customerEmail: 'test@example.com',
    origin: 'https://aramcreationsofficial.netlify.app', cancelToken: 'test-cancel-token',
  };
  for (const [index, locale, path] of [[0, 'el', '/'], [1, 'en', '/en/']] as const) {
    await createStripeCheckoutSession({ ...order, locale });
    const body = new URLSearchParams(fetchMock.mock.calls[index].arguments[1].body as string);
    assert.equal(body.get('locale'), locale);
    assert.equal(body.get('client_reference_id'), order.orderId);
    assert.equal(body.get('line_items[0][price_data][unit_amount]'), '2500');
    const success = new URL(body.get('success_url')!);
    const cancel = new URL(body.get('cancel_url')!);
    assert.equal(success.pathname, path);
    assert.equal(cancel.pathname, path);
    assert.equal(success.searchParams.get('session_id'), '{CHECKOUT_SESSION_ID}');
    assert.equal(success.searchParams.get('order_id'), order.orderId);
    assert.equal(cancel.searchParams.get('order_cancelled'), order.orderId);
    assert.equal(cancel.searchParams.get('cancel_token'), order.cancelToken);
  }
});

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
          origin: 'https://aramcreationsofficial.netlify.app'
        });
      },
      { message: /απαιτείται κλειδί API/ }
    );
  } finally {
    if (oldKey) process.env.STRIPE_SECRET_KEY = oldKey;
  }
});

