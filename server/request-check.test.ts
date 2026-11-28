import { catalogLabelCounts, publicProductDescription } from '../src/lib/catalog-labels';
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractListingState, listingState, classifyVintedCategory } from './vinted-listing';
import { chooseRefreshPatch, RefreshChoice, refreshBaseline } from '../src/lib/vinted-refresh';
import { captureCatalogFields, restorationFields, historyRecords } from '../src/lib/catalog-history';
import { sortPortfolio, movePortfolio } from '../src/lib/portfolio-order';
import { sendOrderEmail, resolveAdminUrl } from './order-notifications';
import { assertInventoryChangeAllowed, assertUnchangedInventory, compareSoldLast, isArchivedJewelry, inventoryEditorPatch, inventoryLabel, inventoryStock, isAvailableForSale, statusForEditedStock, stockForSelectedStatus } from '../src/lib/stock-edit';

test('product archiving preserves legacy archive flags and refuses active checkout reservations', () => {
  assert.equal(isArchivedJewelry({ deletedAt: 'legacy-marker' }), true);
  assert.equal(isArchivedJewelry({ isDeleted: false, deletedAt: null }), false);
  assert.doesNotThrow(() => assertInventoryChangeAllowed({ stock: 1 }, { isDeleted: true }));
  assert.throws(() => assertInventoryChangeAllowed({ checkoutReservations: { pending: 1 } }, { isDeleted: true }), /ενεργή παραγγελία/);
});

test('sold cards follow available and reserved cards, with the selected sort preserved in each group', () => {
  const cards = [
    { id: 1, status: 'Πουλήθηκε' }, { id: 2, status: 'Κρατημένο', stock: 0 },
    { id: 3, status: 'Διαθέσιμο', stock: 0 }, { id: 4, status: 'Διαθέσιμο', stock: 3 }
  ];
  assert.deepEqual(cards.sort((a, b) => compareSoldLast(a, b) || b.id - a.id).map(item => item.id), [4, 2, 3, 1]);
});

test('product edits reject concurrent reservations and stock changes', () => {
  const baseline = { stock: 0, status: 'Κρατημένο', checkoutReservations: { b: 1, a: 1 } };
  assert.doesNotThrow(() => assertUnchangedInventory(baseline, { ...baseline, checkoutReservations: { a: 1, b: 1 } }));
  assert.throws(() => assertUnchangedInventory(baseline, { ...baseline, stock: 1 }));
  assert.throws(() => assertUnchangedInventory(baseline, { ...baseline, checkoutReservations: { a: 1 } }));
  assert.throws(() => assertUnchangedInventory(baseline, { ...baseline, status: 'Διαθέσιμο' }));
});

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
test('order mail goes only to owner, uses canonical Back Office URL, and has an idempotency key', async () => {
  const before = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = 'fixture-only';
  const beforePublicUrl = process.env.PUBLIC_SITE_URL; delete process.env.PUBLIC_SITE_URL;
  const beforeUrl = process.env.URL; process.env.URL = 'https://aramcreationsofficial.netlify.app/';
  try {
    assert.equal(resolveAdminUrl(), 'https://aramcreationsofficial.netlify.app/#admin');
    assert.equal(resolveAdminUrl('https://aramcreationsofficial.netlify.app/'), 'https://aramcreationsofficial.netlify.app/#admin');
    let init: RequestInit | undefined;
    const id = await sendOrderEmail('fixture-order', { number: 'TEST', total: 20 }, (async (_url: any, options: any) => { init = options; return Response.json({ id: 'fixture-mail' }); }) as any);
    assert.equal(id, 'fixture-mail');
    assert.equal((init!.headers as any)['Idempotency-Key'], 'order-notification/fixture-order');
    const body = JSON.parse(String(init!.body)); assert.deepEqual(body.to, ['aristeaamnta@gmail.com']);
    assert.ok(!body.text.includes('customer')); assert.ok(body.text.includes('20.00'));
    assert.ok(body.text.includes('https://aramcreationsofficial.netlify.app/#admin'));
    await assert.rejects(sendOrderEmail('fixture-order', { number: 'TEST', total: 20 }, (async () => new Response(null,{status:429})) as any));
  } finally {
    if (before === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = before;
    if (beforePublicUrl === undefined) delete process.env.PUBLIC_SITE_URL; else process.env.PUBLIC_SITE_URL = beforePublicUrl;
    if (beforeUrl === undefined) delete process.env.URL; else process.env.URL = beforeUrl;
  }
});

test('selecting available restocks zero once and badges agree with legacy stock', () => {
  assert.equal(stockForSelectedStatus('Διαθέσιμο', 0), 1);
  assert.equal(stockForSelectedStatus('Διαθέσιμο', 7), 7);
  assert.equal(stockForSelectedStatus('Πουλήθηκε', 7), 0);
  assert.equal(inventoryLabel({ status: 'Διαθέσιμο', stock: 0 }), 'Πουλήθηκε');
  assert.equal(inventoryLabel({ status: 'Διαθέσιμο', stock: 1 }), 'Διαθέσιμο');
  assert.equal(inventoryLabel({ status: 'Κρατημένο', stock: 0 }), 'Κρατημένο');
  assert.equal(inventoryLabel({ status: 'Δωρίστηκε', stock: 0 }), 'Δωρίστηκε');
});


test('availability and labels use inherited stock while explicit non-sale statuses survive stock edits', () => {
  const emptyLegacy = { status: 'Διαθέσιμο', stockCount: 0 };
  assert.equal(inventoryStock(emptyLegacy), 0);
  assert.equal(isAvailableForSale(emptyLegacy), false);
  assert.equal(inventoryLabel(emptyLegacy), 'Πουλήθηκε');
  assert.equal(isAvailableForSale({ status: 'Διαθέσιμο' }), true);
  assert.equal(isAvailableForSale({ status: 'Διαθέσιμο', stock: 0, stockCount: 4 }), false);
  assert.equal(isAvailableForSale({ status: 'Διαθέσιμο', stock: 1, isDeleted: true }), false);
  assert.equal(statusForEditedStock('Κρατημένο', 0), 'Κρατημένο');
  assert.equal(statusForEditedStock('Διαθέσιμο', 0), 'Πουλήθηκε');
});


test('an unrelated product edit preserves legacy stock and the stored status', () => {
  const legacy = { status: 'Διαθέσιμο', stockCount: 0 };
  assert.deepEqual(inventoryEditorPatch(legacy, 'Πουλήθηκε', 0), {});
  assert.deepEqual(inventoryEditorPatch({ status: 'Κρατημένο', stockCount: 2 }, 'Κρατημένο', 2), {});
  assert.deepEqual(inventoryEditorPatch(legacy, 'Διαθέσιμο', 1), { status: 'Διαθέσιμο', stock: 1 });
  assert.deepEqual(inventoryEditorPatch(null, 'Διαθέσιμο', 0), { status: 'Πουλήθηκε', stock: 0 });
});


test('bulk history restores field presence and supports redo after serialization', () => {
  const fixtures = [
    { id: 'legacy', status: 'Διαθέσιμο', stockCount: 2, notes: 'Legacy copy' },
    { id: 'zero', status: 'Διαθέσιμο', stock: 0, description: null },
  ];
  const change = { status: 'Πουλήθηκε', stock: 0, description: 'New copy' };
  const before = fixtures.map(item => ({ id: item.id, ...captureCatalogFields(item, Object.keys(change)) }));
  const after = before.map(item => ({ ...item, ...change }));
  const stored = JSON.parse(JSON.stringify({ type: 'BULK_UPDATE', before, after }));
  for (const [index, record] of historyRecords(stored).entries()) {
    const original = fixtures[index];
    const updated = { ...original, ...change };
    const undo = restorationFields(record.before, record.after, updated);
    const restored = { ...updated };
    for (const [field, value] of Object.entries(undo)) {
      if (value === undefined) delete restored[field];
      else restored[field] = value;
    }
    assert.deepEqual(restored, original);
    assert.equal(isAvailableForSale(restored), index === 0);
    assert.equal(publicProductDescription(restored), index === 0 ? 'Legacy copy' : '');
    const redo = restorationFields(record.after, record.before, restored);
    assert.deepEqual({ ...restored, ...redo }, updated);
    assert.throws(() => restorationFields(record.before, record.after, {
      ...updated, checkoutReservations: { pending: 1 },
    }));
  }
});

test('catalogue usage counts group labels the same way as filters', () => {
  assert.deepEqual(catalogLabelCounts(
    ['Σκουλαρίκια', 'ΣΚΟΥΛΑΡΙΚΙΑ', 'σκουλαρικια', '  Real   Flowers ', undefined],
    ['Σκουλαρίκια', 'Real Flowers', 'Unused']
  ), { Σκουλαρίκια: 3, 'Real Flowers': 1, Unused: 0 });
});
