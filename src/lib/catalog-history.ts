import { collection, doc, Firestore, getDoc, runTransaction, serverTimestamp, writeBatch, deleteField, Timestamp } from 'firebase/firestore';

const plain = (value: any) => JSON.parse(JSON.stringify(value ?? null));
const equal = (a: any, b: any) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));
function revive(value: any): any {
  if (value && typeof value === 'object' && value.type === 'firestore/timestamp/1.0' && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) return new Timestamp(value.seconds, value.nanoseconds);
  return Array.isArray(value) ? value.map(revive) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)])) : value;
}
export async function persistHistory(db: Firestore, entry: any) {
  const ref = doc(collection(db, 'catalogHistory'));
  const data = JSON.stringify(entry);
  // Bounded chunk size also works for bulk changes with long descriptions.
  const chunks = Array.from({ length: Math.ceil(data.length / 100000) }, (_, i) => data.slice(i * 100000, (i + 1) * 100000));
  if (chunks.length > 490) throw new Error('Το ιστορικό είναι πολύ μεγάλο.');
  const batch = writeBatch(db);
  chunks.forEach((text, index) => batch.set(doc(db, 'catalogHistory', ref.id, 'parts', String(index)), { text }));
  batch.set(ref, { type: entry.type || 'ACTION', id: entry.id || '', name: entry.name || '', message: entry.message || '', timestamp: entry.timestamp, collection: entry.collection || 'jewelry', parts: chunks.length, hasBefore: Boolean(entry.before), hasAfter: Boolean(entry.after), cloudId: ref.id });
  await batch.commit();
}
export async function loadHistory(db: Firestore, entry: any) {
  if (!entry.cloudId) return entry;
  const parts = await Promise.all(Array.from({ length: entry.parts }, (_, i) => getDoc(doc(db, 'catalogHistory', entry.cloudId, 'parts', String(i)))));
  if (parts.some(part => !part.exists())) throw new Error('Δεν βρέθηκε ολόκληρη η εγγραφή ιστορικού.');
  return JSON.parse(parts.map(part => part.data()!.text).join(''));
}
export function historyRecords(entry: any) {
  const kind = entry.collection || 'jewelry';
  if (entry.type === 'BULK_DUPLICATE') return (entry.after || []).map((item: any) => ({ id: item.id, collection: kind, before: undefined, after: item }));
  if (Array.isArray(entry.before) || Array.isArray(entry.after)) {
    const before = new Map((Array.isArray(entry.before) ? entry.before : []).filter((x: any) => x.id).map((x: any) => [x.id, x]));
    const after = new Map((Array.isArray(entry.after) ? entry.after : []).filter((x: any) => x.id).map((x: any) => [x.id, x]));
    return [...new Set([...before.keys(), ...after.keys()])].map(id => ({ id: String(id), collection: kind, before: before.get(id), after: after.get(id) }));
  }
  return entry.id ? [{ id: kind === 'settings' ? 'shop' : entry.id, collection: kind, before: entry.before, after: entry.after }] : [];
}
export function restorationFields(before: any, after: any, latest: any) {
  const ignored = new Set(['id', 'createdAt', 'updatedAt', 'checkoutReservations']);
  if (Object.values(latest?.checkoutReservations || {}).some(q => Number(q) > 0)) throw new Error('Υπάρχει ενεργή παραγγελία. Η επαναφορά δεν επιτρέπεται.');
  const patch: Record<string, any> = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (ignored.has(key) || equal(before?.[key], after?.[key])) continue;
    if (!equal(latest?.[key], after?.[key])) throw new Error(`Το πεδίο «${key}» άλλαξε μετά την καταγραφή. Η επαναφορά σταμάτησε.`);
    patch[key] = before && Object.hasOwn(before, key) ? before[key] : undefined;
  }
  return patch;
}
export async function restoreHistory(db: Firestore, entry: any) {
  const records = historyRecords(entry);
  if (!records.length || records.length > 500) throw new Error('Η εγγραφή δεν μπορεί να επαναφερθεί.');
  await runTransaction(db, async tx => {
    const refs = records.map(r => doc(db, r.collection, r.id));
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const plans = records.map((r, i) => {
      const latest = snapshots[i].exists() ? snapshots[i].data() : undefined;
      if (!r.after && latest) throw new Error('Η καταχώρηση υπάρχει ήδη και έχει αλλάξει.');
      if (r.after && !latest) throw new Error('Η καταχώρηση έχει αφαιρεθεί από άλλη ενέργεια.');
      return restorationFields(r.before, r.after, latest);
    });
    records.forEach((r, i) => {
      if (!r.before) { tx.delete(refs[i]); return; }
      const patch = Object.fromEntries(Object.entries(plans[i]).map(([key, value]) => [key, value === undefined ? deleteField() : revive(value)]));
      if (snapshots[i].exists()) tx.update(refs[i], { ...patch, updatedAt: serverTimestamp() });
      else { const { id, checkoutReservations, ...data } = r.before; tx.set(refs[i], { ...revive(data), updatedAt: serverTimestamp() }); }
    });
  });
}
