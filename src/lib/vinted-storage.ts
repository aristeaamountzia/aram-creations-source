import { doc, Firestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { refreshBaseline } from './vinted-refresh';
import { persistHistory } from './catalog-history';
export async function applyVintedRefresh(db: Firestore, id: string, baseline: any, patch: Record<string, any>, collection = 'jewelry') {
  if (!Object.keys(patch).length) return;
  let savedBefore: any;
  await runTransaction(db, async transaction => {
    const ref = doc(db, collection, id), snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Το προϊόν διαγράφηκε.');
    const latest = snapshot.data();
    if (refreshBaseline(latest) !== refreshBaseline(baseline)) throw new Error('Το προϊόν άλλαξε μετά τον έλεγχο. Έλεγξέ το ξανά.');
    if (Object.values(latest.checkoutReservations || {}).some(q => Number(q) > 0) && ('stock' in patch || 'status' in patch)) throw new Error('Νέα δέσμευση παραγγελίας· έλεγξε ξανά.');
    const backup = Object.fromEntries(Object.keys(patch).map(key => [key, latest[key] ?? null]));
    savedBefore = backup;
    transaction.update(ref, { ...patch, vintedRefreshBackup: { at: new Date().toISOString(), data: backup }, lastVintedRefreshAt: new Date().toISOString(), updatedAt: serverTimestamp() });
  });
  await persistHistory(db, { type: 'VINTED_REFRESH', id, name: baseline.name || id, message: 'Επιλεγμένες αλλαγές από Vinted', collection, timestamp: new Date().toISOString(), before: savedBefore, after: patch }).catch(() => { throw new Error('Οι αλλαγές αποθηκεύτηκαν, αλλά δεν καταγράφηκαν στο cloud ιστορικό. Υπάρχει το backup στο προϊόν.'); });
}
