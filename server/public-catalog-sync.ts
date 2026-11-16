import { isDeepStrictEqual } from 'node:util';
import { publicJewelryRecord, PUBLIC_JEWELRY_COLLECTION } from '../src/lib/public-catalog';

/** Read current state inside the transaction: delayed/duplicate events cannot
 * resurrect a deleted product or overwrite a newer publication. */
export async function syncPublicJewelry(db: any, itemId: string) {
  return db.runTransaction(async (tx: any) => {
    const source = db.doc(`jewelry/${itemId}`);
    const target = db.doc(`${PUBLIC_JEWELRY_COLLECTION}/${itemId}`);
    const [item, published] = await Promise.all([tx.get(source), tx.get(target)]);
    const data = item.data();
    if (!item.exists || data.isDeleted || data.deletedAt) {
      if (published.exists) tx.delete(target);
      return published.exists ? 'deleted' : 'unchanged';
    }
    const next = publicJewelryRecord(data);
    if (published.exists && isDeepStrictEqual(published.data(), next)) return 'unchanged';
    tx.set(target, next);
    return 'published';
  });
}
