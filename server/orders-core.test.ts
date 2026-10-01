import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrder, priceOrder, nextStatus } from './orders-core';
const makeInput = (extra: Record<string, unknown> = {}) => ({ requestId: '00000000-0000-4000-8000-000000000001', expectedTotal: 22.5, customer: { name: 'Δοκιμή', email: 'test@example.com', phone: '6900000000', address: 'Test 1', city: 'Test', postalCode: '12345' }, items: [{ id: 'test_product', quantity: 1, price: 0.01 }], shippingMethod: 'boxnow', paymentMethod: 'iris', ...extra });
const product = { id: 'test_product', name: 'Test', status: 'Διαθέσιμο', stock: 1, price: 20 };
test('server prices ignore client-supplied prices and totals', () => {
  assert.equal(priceOrder(normalizeOrder(makeInput({ total: 0.01 })), [product]).total, 22.5);
});
test('reject quantities exceeding stock or unavailable products', () => {
  assert.throws(() => priceOrder(normalizeOrder(makeInput({ items: [{ id: 'test_product', quantity: 2 }] })), [product]));
  for (const changed of [{ ...product, stock: 0 }, { ...product, status: 'Κρατημένο' }, { ...product, isDeleted: true }, null]) assert.throws(() => priceOrder(normalizeOrder(makeInput()), [changed]));
});
test('reject duplicate IDs, invalid quantities and database path injection', () => {
  for (const items of [[{ id: 'x', quantity: 1 }, { id: 'x', quantity: 1 }], [{ id: '../x', quantity: 1 }], [{ id: 'x', quantity: -1 }], [{ id: 'x', quantity: 0.5 }], []]) assert.throws(() => normalizeOrder(makeInput({ items })));
});
test('validate customer, honeypot and payment method', () => {
  assert.throws(() => normalizeOrder(makeInput({ customer: { email: 'bad' } })));
  assert.throws(() => normalizeOrder(makeInput({ website: 'spam' })));
  assert.throws(() => normalizeOrder(makeInput({ paymentMethod: 'cod' })));
  assert.throws(() => normalizeOrder(makeInput({ shippingMethod: 'courier', paymentMethod: 'cod' })));
});
test('shipping threshold uses exact cents, and removed pickup is rejected', () => {
  assert.equal(priceOrder(normalizeOrder(makeInput()), [{ ...product, price: 45 }]).shippingCost, 0);
  assert.equal(priceOrder(normalizeOrder(makeInput()), [{ ...product, price: 44.99 }]).shippingCost, 2.5);
  assert.equal(priceOrder(normalizeOrder(makeInput({ shippingMethod: 'courier' })), [{ ...product, price: 50 }]).shippingCost, 0);
  const raw = makeInput({ shippingMethod: 'pickup' }); raw.customer.address = ''; raw.customer.city = '';
  assert.throws(() => normalizeOrder(raw));
});
test('reject zero or invalid catalog price', () => {
  for (const price of [0, -1, NaN, undefined]) assert.throws(() => priceOrder(normalizeOrder(makeInput()), [{ ...product, price }]));
});
test('status transitions prevent reopening cancelled orders or shipping unpaid orders', () => {
  assert.doesNotThrow(() => nextStatus('pending', 'paid'));
  assert.doesNotThrow(() => nextStatus('paid', 'cancelled'));
  assert.throws(() => nextStatus('pending', 'shipped'));
  assert.doesNotThrow(() => nextStatus('pending', 'shipped', 'cod'));
  assert.throws(() => nextStatus('cancelled', 'paid'));
  assert.throws(() => nextStatus('delivered', 'cancelled'));
});
