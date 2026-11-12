import test from 'node:test';
import assert from 'node:assert/strict';
import { findVintedImportDuplicate, vintedImportIdentityKeys } from '../src/lib/vinted-import';

test('matches the same Vinted listing across slugs, query strings and legacy link fields', () => {
  const existing = {
    id: 'local-1',
    purchaseLinks: [{ site: 'Vinted', url: 'https://www.vinted.gr/items/123-old-title?referrer=catalog' }],
  };
  const incoming = {
    sourcePlatform: 'vinted',
    sourceId: '123',
    sourceUrl: 'https://vinted.gr/items/123-new-title',
  };
  const match = findVintedImportDuplicate(incoming, [existing]);
  assert.equal(match?.item.id, 'local-1');
  assert.equal(match?.key, 'listing:123');
  assert.equal(match?.reason, 'listing');
});

test('matches legacy records by an exact Vinted media asset when the listing id is missing', () => {
  const existing = { id: 'legacy', imageUrl: 'https://images1.vinted.net/t/01_abc/file.jpeg?s=800x800' };
  const incoming = { mediaList: [{ url: 'https://images1.vinted.net/t/01_abc/file.jpeg?s=1200x1200' }] };
  assert.equal(findVintedImportDuplicate(incoming, [existing])?.reason, 'media');
});

test('does not treat an equal title and price or an untrusted URL as a duplicate', () => {
  const existing = { id: 'other', name: 'Χειροποίητο κολιέ', price: 20 };
  const incoming = {
    name: 'Χειροποίητο κολιέ',
    price: 20,
    sourceUrl: 'https://vinted.gr.evil.example/items/123-title',
    imageUrl: 'https://example.com/photo.jpg',
  };
  assert.equal(findVintedImportDuplicate(incoming, [existing]), null);
  assert.deepEqual(vintedImportIdentityKeys(incoming), []);
});

test('does not confuse an unrelated numeric source id with a Vinted id', () => {
  assert.deepEqual(vintedImportIdentityKeys({ sourcePlatform: 'wix', sourceId: '123' }), []);
});
