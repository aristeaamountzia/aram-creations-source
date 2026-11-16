import { collection, doc, Firestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { equalHistoryValue } from './catalog-history';
import { assertInventoryChangeAllowed, assertUnchangedInventory } from './stock-edit';

export type JewelryChange = { id: string; patch?: Record<string, any>; create?: boolean; remove?: boolean; baseline?: Record<string, any>; duplicateOf?: string };

/** Apply catalog edits atomically and preserve inventory owned by checkout. */
export async function writeJewelryChanges(db: Firestore, changes: JewelryChange[]) {
  if (!changes.length) return;
  if (changes.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική ενέργεια.');
  return runTransaction(db, async tx => {
    const refs = changes.map(change => doc(db, 'jewelry', change.id));
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const originals = await Promise.all(changes.map(change => change.duplicateOf ? tx.get(doc(db, 'jewelry', change.duplicateOf)) : undefined));
    const results = changes.map((change, index) => {
      const snapshot = snapshots[index];
      if (change.create && snapshot.exists()) throw new Error('Η νέα καταχώρηση υπάρχει ήδη. Δοκίμασε ξανά.');
      if (!change.create && !snapshot.exists()) throw new Error('Το προϊόν δεν υπάρχει πλέον.');
      const before = snapshot.data();
      const patch = change.patch || {};
      if (change.duplicateOf) {
        const original = originals[index];
        if (!original?.exists()) throw new Error('Το αρχικό προϊόν δεν υπάρχει πλέον.');
        assertUnchangedInventory(change.baseline || {}, original.data());
      }
      if (before) {
        assertInventoryChangeAllowed(before, change.remove ? undefined : patch);
        if (change.baseline) {
          if (change.remove && Object.keys(before).some(key => !['id', 'createdAt', 'updatedAt'].includes(key) && !equalHistoryValue(before[key], change.baseline![key]))) {
            throw new Error('Το προϊόν άλλαξε μετά την επιλογή. Φόρτωσε ξανά πριν το διαγράψεις.');
          }
          if (change.remove || 'stock' in patch || 'status' in patch) assertUnchangedInventory(change.baseline, before);
          for (const key of Object.keys(patch)) {
            if (['updatedAt', 'createdAt'].includes(key)) continue;
            if (!equalHistoryValue(before[key], change.baseline[key])) throw new Error(`Το πεδίο «${key}» άλλαξε από άλλη ενέργεια. Φόρτωσε ξανά το προϊόν.`);
          }
        }
      } else if (Object.keys(patch.checkoutReservations || {}).length) throw new Error('Νέο προϊόν δεν μπορεί να αντιγράψει δεσμεύσεις παραγγελιών.');
      return { id: change.id, before, after: change.remove ? undefined : { ...before, ...patch, updatedAt: serverTimestamp() } };
    });
    results.forEach((result, index) => {
      if (changes[index].remove) tx.delete(refs[index]);
      else if (changes[index].create) tx.set(refs[index], result.after);
      else tx.update(refs[index], { ...changes[index].patch, updatedAt: result.after!.updatedAt });
    });
    return results;
  });
}

export async function addJewelryItem(db: Firestore, data: Record<string, any>) {
  const ref = doc(collection(db, 'jewelry'));
  await writeJewelryChanges(db, [{ id: ref.id, patch: data, create: true }]);
  return ref;
}
