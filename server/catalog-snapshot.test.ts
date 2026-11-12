import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnconfirmedEmptyCatalog } from '../src/lib/catalog-snapshot';

test('waits for remote data when the offline Firestore cache is empty', () => {
  assert.equal(isUnconfirmedEmptyCatalog({ empty: true, metadata: { fromCache: true } }), true);
});

test('accepts remote empty catalogs and non-empty cached catalogs', () => {
  assert.equal(isUnconfirmedEmptyCatalog({ empty: true, metadata: { fromCache: false } }), false);
  assert.equal(isUnconfirmedEmptyCatalog({ empty: false, metadata: { fromCache: true } }), false);
});
