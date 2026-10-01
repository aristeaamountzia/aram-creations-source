import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshBaseline, vintedRefreshPatch, vintedSourceUrl } from '../src/lib/vinted-refresh';
const current = { price: 12, status: 'Διαθέσιμο', stock: 2, shopFavorites: 8, name: 'Local title' };
test('missing metrics, invalid price and unknown availability do not erase local data', () => {
  const result = vintedRefreshPatch(current, { price: null, vintedFavorites: null, availabilityKnown: false }, { sitePrice: 0 });
  assert.deepEqual(result.patch, {});
});
test('explicit Vinted sale updates stock, but an order reservation protects it', () => {
  const row = { price: 10, currency: 'EUR', isSold: true, availabilityKnown: true };
  const normal = vintedRefreshPatch(current, row, { sitePrice: 15 });
  assert.equal(normal.patch.stock, 0); assert.equal(normal.patch.status, 'Πουλήθηκε'); assert.equal(normal.patch.price, 15);
  const reserved = vintedRefreshPatch({ ...current, checkoutReservations: { order: 1 } }, row, { sitePrice: 15 });
  assert.equal(reserved.patch.stock, undefined); assert.equal(reserved.patch.status, undefined);
});
test('availability only releases a hold previously made by Vinted, never recreates sold stock', () => {
  const row = { availabilityKnown: true, availability: 'available' };
  assert.equal(vintedRefreshPatch({ ...current, status: 'Κρατημένο', lastVintedAvailability: 'reserved' }, row, {}).patch.status, 'Διαθέσιμο');
  assert.equal(vintedRefreshPatch({ ...current, status: 'Πουλήθηκε', stock: 0 }, row, {}).patch.stock, undefined);
  assert.equal(vintedRefreshPatch({ ...current, status: 'Κρατημένο' }, row, {}).patch.status, undefined);
});
test('zero metrics are valid, shop favorites and descriptions remain untouched', () => {
  const patch = vintedRefreshPatch(current, { price: 10, currency: 'USD', vintedFavorites: 0, vintedViews: 0 }, { sitePrice: 15 }).patch;
  assert.deepEqual(patch, { vintedFavorites: 0, vintedViews: 0 });
});
test('baseline detects new orders and price changes before applying preview', () => {
  assert.notEqual(refreshBaseline(current), refreshBaseline({ ...current, checkoutReservations: { newOrder: 1 } }));
  assert.notEqual(refreshBaseline(current), refreshBaseline({ ...current, price: 20 }));
});
test('a non-Vinted source does not hide a valid Vinted purchase link', () => {
  assert.equal(vintedSourceUrl({ sourceUrl: 'https://wix.com/item', purchaseLinks: [{ site: 'Αγορά', url: 'https://www.vinted.gr/items/123-test' }] }), 'https://www.vinted.gr/items/123-test');
  assert.equal(vintedSourceUrl({ sourceUrl: 'https://vinted.gr.evil.com/items/123-test' }), '');
});
test('map key order does not create a false concurrent-edit conflict', () => {
  assert.equal(refreshBaseline({ purchaseLinks: [{ site: 'Vinted', url: 'link' }] }), refreshBaseline({ purchaseLinks: [{ url: 'link', site: 'Vinted' }] }));
});

