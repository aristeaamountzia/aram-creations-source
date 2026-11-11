import test from 'node:test';
import assert from 'node:assert/strict';
import { cancelOrder, initialOrderStatus, markStripeOrderPaid, paidPatch, releasePatch, reservationPatch, resolveStripeOrderId } from './order-lifecycle';

function fakeDb(initial: Record<string, any>) {
  const docs = new Map(Object.entries(structuredClone(initial)));
  const ref = (path: string) => ({ path });
  const apply = (path: string, patch: Record<string, any>) => {
    const current = docs.get(path) || {};
    for (const [key, value] of Object.entries(patch)) {
      const reservation = key.match(/^checkoutReservations\.(.+)$/);
      if (reservation) {
        current.checkoutReservations ||= {};
        if (typeof value === 'number') current.checkoutReservations[reservation[1]] = value;
        else delete current.checkoutReservations[reservation[1]];
      } else current[key] = value;
    }
    docs.set(path, current);
  };
  return {
    docs,
    doc: ref,
    runTransaction: async (fn: any) => fn({
      get: async (document: { path: string }) => ({ exists: docs.has(document.path), data: () => structuredClone(docs.get(document.path)), ref: document }),
      update: (document: { path: string }, patch: Record<string, any>) => apply(document.path, patch),
      delete: (document: { path: string }) => docs.delete(document.path)
    })
  };
}

test('Stripe orders begin in waiting_payment while offline methods remain pending', () => {
  assert.equal(initialOrderStatus('stripe'), 'waiting_payment');
  assert.equal(initialOrderStatus('iris'), 'pending');
});

test('reservation decrements stock once and rejects a conflicting duplicate', () => {
  assert.deepEqual(reservationPatch({ stock: 3 }, 'order-1', 1), {
    stock: 2,
    'checkoutReservations.order-1': 1,
    status: 'Διαθέσιμο'
  });
  assert.equal(reservationPatch({ stock: 2, checkoutReservations: { 'order-1': 1 } }, 'order-1', 1), null);
  assert.throws(() => reservationPatch({ stock: 2, checkoutReservations: { 'order-1': 1 } }, 'order-1', 2));
  assert.throws(() => reservationPatch({ stock: 0 }, 'order-2', 1));
});

test('paid transition retains reservation so cancellation can restore exact stock once', () => {
  const product = { stock: 2, status: 'Κρατημένο', checkoutReservations: { 'order-1': 1 } };
  assert.deepEqual(paidPatch(product, 'order-1'), { status: 'Διαθέσιμο' });
  const released = releasePatch({ ...product, status: 'Πουλήθηκε' }, 'order-1');
  assert.equal(released?.stock, 3);
  assert.equal(released?.restored, 1);
  assert.equal(releasePatch({ stock: 3, checkoutReservations: {} }, 'order-1'), null);
});

test('payment and duplicate webhook mutate the order and product once', async () => {
  const db = fakeDb({
    'orders/order-1': { number: 'ARAM-1', total: 20, status: 'waiting_payment', paymentMethod: 'stripe', stripeSessionId: 'cs_1', items: [{ id: 'product-1', quantity: 1 }], history: [] },
    'jewelry/product-1': { stock: 2, status: 'Διαθέσιμο', checkoutReservations: { 'order-1': 1 } }
  });
  const session = { id: 'cs_1', payment_intent: 'pi_1' };
  const first = await markStripeOrderPaid(db, 'order-1', session, 'stripe_webhook');
  const duplicate = await markStripeOrderPaid(db, 'order-1', session, 'stripe_webhook');
  assert.equal(first.alreadyPaid, false);
  assert.equal(duplicate.alreadyPaid, true);
  assert.equal(db.docs.get('jewelry/product-1').stock, 2);
  assert.equal(db.docs.get('orders/order-1').history.length, 1);
});

test('cancellation and duplicate cancellation restore stock once and stop email retry', async () => {
  const db = fakeDb({
    'orders/order-1': { status: 'paid', paymentMethod: 'stripe', items: [{ id: 'product-1', quantity: 1 }], history: [], emailNotification: 'pending' },
    'jewelry/product-1': { stock: 2, status: 'Πουλήθηκε', checkoutReservations: { 'order-1': 1 } },
    'orderNotifications/order-1': { state: 'pending' }
  });
  const first = await cancelOrder(db, 'order-1', 'admin_cancelled');
  const duplicate = await cancelOrder(db, 'order-1', 'admin_cancelled');
  assert.equal(first.restored, 1);
  assert.equal(duplicate.restored, 0);
  assert.equal(db.docs.get('jewelry/product-1').stock, 3);
  assert.equal(db.docs.get('orders/order-1').emailNotification, 'cancelled');
  assert.equal(db.docs.has('orderNotifications/order-1'), false);
});

test('expired checkout releases reservation and cannot release it twice', async () => {
  const db = fakeDb({
    'orders/order-1': { status: 'waiting_payment', paymentMethod: 'stripe', items: [{ id: 'product-1', quantity: 1 }], history: [] },
    'jewelry/product-1': { stock: 0, status: 'Κρατημένο', checkoutReservations: { 'order-1': 1 } }
  });
  await cancelOrder(db, 'order-1', 'stripe_checkout_expired', ['waiting_payment', 'pending']);
  await cancelOrder(db, 'order-1', 'stripe_checkout_expired', ['waiting_payment', 'pending']);
  assert.equal(db.docs.get('jewelry/product-1').stock, 1);
  assert.equal(db.docs.get('orders/order-1').status, 'cancelled');
});

test('payment without this order reservation is rejected', () => {
  assert.throws(() => paidPatch({ stock: 0, checkoutReservations: {} }, 'order-1'));
});

test('Stripe confirmation only accepts the order bound to the paid session', () => {
  const session = { id: 'cs_1', client_reference_id: 'order-1' };
  assert.equal(resolveStripeOrderId(session, 'order-1'), 'order-1');
  assert.throws(() => resolveStripeOrderId(session, 'order-2'));
  assert.throws(() => resolveStripeOrderId({ id: 'cs_2' }));
});
