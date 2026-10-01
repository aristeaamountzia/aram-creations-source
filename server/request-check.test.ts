import test from 'node:test';
import assert from 'node:assert/strict';
import { extractListingState, listingState, classifyVintedCategory } from './vinted-listing';
import { chooseRefreshPatch, RefreshChoice, refreshBaseline } from '../src/lib/vinted-refresh';
import { restorationFields, historyRecords } from '../src/lib/catalog-history';
import { sortPortfolio, movePortfolio } from '../src/lib/portfolio-order';
import { sendOrderEmail } from './order-notifications';

test('current listing status ignores recommended listings and supports numeric/string IDs in RSC', () => {
  const source = '<script>' + JSON.stringify({ item: { id: 123, is_sold: false, is_reserved: true, is_closed: false }, recommended: { id: 456, is_sold: true } }) + '</script>';
  assert.equal(extractListingState(source, '123')?.availability, 'reserved');
  assert.equal(extractListingState(source.replaceAll('"','\\"'), '123')?.availability, 'reserved');
  assert.equal(extractListingState(JSON.stringify({ id: '123', is_sold: true }), '123')?.availability, 'sold');
  assert.equal(extractListingState(source, '999'), null);
});
test('closed is unavailable, not proof of sale; condition codes do not imply availability', () => {
  assert.equal(listingState({ is_closed: true })?.availability, 'unavailable');
  assert.equal(listingState({ is_closed: true, is_reserved: true })?.availability, 'reserved');
  assert.equal(listingState({ status: 4 }), null);
  assert.equal(listingState({ is_sold: false }), null);
  assert.equal(listingState({ is_sold: false, is_reserved: false, is_closed: false })?.availability, 'available');
});
test('title decides category, including sets, accented Greek and lighter cases', () => {
  assert.equal(classifyVintedCategory('Σετ σκουλαρίκια και κολιέ','Necklaces'), 'Σετ');
  assert.equal(classifyVintedCategory('Θήκη αναπτήρα από υγρό γυαλί','Phone cases'), 'Θήκες Αναπτήρων');
  assert.equal(classifyVintedCategory('Μπρελόκ με λουλούδια','Rings'), 'Μπρελόκ');
  assert.equal(classifyVintedCategory('Σκουλαρίκια','Necklaces'), 'Σκουλαρίκια');
  assert.equal(classifyVintedCategory('Handmade','Bracelets'), 'Βραχιόλια');
  assert.equal(classifyVintedCategory('Handmade asset','Accessories'), 'Άλλα');
});
const choices: RefreshChoice = { price: true, availability: false, favorites: false, views: false, priceValue: '12.34', statusValue: 'Πουλήθηκε', stockValue: '0' };
const current = { price: 10, status: 'Διαθέσιμο', stock: 1, vintedFavorites: 5 };
const proposed = { price: 20, vintedBasePrice: 15, vintedPricing: { sitePrice: 20 }, status: 'Πουλήθηκε', stock: 0, lastVintedAvailability: 'sold', vintedFavorites: 10 };
test('manual price and selected fields do not accept declined availability or metrics', () => {
  const patch = chooseRefreshPatch(current, proposed, choices);
  assert.equal(patch.price, 12.34); assert.equal(patch.vintedPricing.mode, 'manual');
  assert.ok(!('status' in patch)); assert.ok(!('lastVintedAvailability' in patch)); assert.ok(!('vintedFavorites' in patch));
  const statusOnly = chooseRefreshPatch(current, proposed, { ...choices, price: false, availability: true });
  assert.equal(statusOnly.status, 'Πουλήθηκε'); assert.equal(statusOnly.stock, 0); assert.ok(!('price' in statusOnly));
});
test('invalid prices and checkout reservation overrides are rejected', () => {
  for (const value of ['', '-1', 'NaN', '100001']) assert.throws(() => chooseRefreshPatch(current, proposed, { ...choices, priceValue: value }));
  assert.throws(() => chooseRefreshPatch({ ...current, checkoutReservations: { x: 1 } }, proposed, { ...choices, availability: true }));
  assert.notEqual(refreshBaseline(current), refreshBaseline({ ...current, vintedFavorites: 100 }));
});
test('history undo/redo preserves unrelated fields and refuses later edits or orders', () => {
  assert.deepEqual(restorationFields({ price: 10 }, { price: 20 }, { price: 20, name: 'New title' }), { price: 10 });
  assert.deepEqual(restorationFields({ price: 20 }, { price: 10 }, { price: 10 }), { price: 20 });
  assert.throws(() => restorationFields({ price: 10 }, { price: 20 }, { price: 30 }));
  assert.throws(() => restorationFields({ price: 10 }, { price: 20 }, { price: 20, checkoutReservations: { x: 1 } }));
  assert.deepEqual(restorationFields({}, { portfolioOrder: 3 }, { portfolioOrder: 3 }), { portfolioOrder: undefined });
  const duplicate = historyRecords({ type: 'BULK_DUPLICATE', before: [{ id: 'original' }], after: [{ id: 'copy' }] });
  assert.equal(duplicate.length, 1); assert.equal(duplicate[0].id, 'copy'); assert.equal(duplicate[0].before, undefined);
});
test('portfolio ordering is stable and moves forward/back without dropping filtered records', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(movePortfolio(items, 'a','c').map(x => x.id), ['b','c','a']);
  assert.deepEqual(movePortfolio(items, 'c','a').map(x => x.id), ['c','a','b']);
  assert.equal(movePortfolio(items,'missing','a'),items);
  assert.deepEqual(sortPortfolio([{ id: 'a' }, { id: 'b', portfolioOrder: 1 }, { id: 'c', portfolioOrder: 0 }]).map(x => x.id), ['c','b','a']);
});
test('order mail goes only to owner, excludes customer details and has an idempotency key', async () => {
  const before = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = 'fixture-only';
  try {
    let init: RequestInit | undefined;
    const id = await sendOrderEmail('fixture-order', { number: 'TEST', total: 20 }, (async (_url: any, options: any) => { init = options; return Response.json({ id: 'fixture-mail' }); }) as any);
    assert.equal(id, 'fixture-mail');
    assert.equal((init!.headers as any)['Idempotency-Key'], 'order-notification/fixture-order');
    const body = JSON.parse(String(init!.body)); assert.deepEqual(body.to, ['aristeaamnta@gmail.com']);
    assert.ok(!body.text.includes('customer')); assert.ok(body.text.includes('20.00'));
    await assert.rejects(sendOrderEmail('fixture-order', { number: 'TEST', total: 20 }, (async () => new Response(null,{status:429})) as any));
  } finally { if (before === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = before; }
});
