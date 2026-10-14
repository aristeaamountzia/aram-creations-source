import { collection, doc, getDocFromServer, type Firestore, type DocumentReference } from 'firebase/firestore';
import { wire, type CatalogOperation } from './catalog-wire';
type Transport = (request: { requestId: string; operations: CatalogOperation[]; reads: { path: string; exists: boolean; data: any }[] }) => Promise<void>;
const transports = new WeakMap<Firestore, Transport>();
export const configureCatalogWrites = (db: Firestore, transport: Transport) => transports.set(db, transport);
async function send(db: Firestore, operations: CatalogOperation[], reads: any[] = [], requestId = crypto.randomUUID()) {
  const transport = transports.get(db);
  if (!transport) throw Error('Ο ασφαλής μηχανισμός αποθήκευσης δεν έχει συνδεθεί.');
  await transport({ requestId, operations, reads });
}
const operation = (method: CatalogOperation['method'], ref: DocumentReference, data?: any, options?: any): CatalogOperation => ({ method, path: ref.path, ...(data === undefined ? {} : { data: wire(data) }), ...(options?.merge ? { merge: true } : {}), ...(options?.mergeFields ? { mergeFields: options.mergeFields } : {}) });
export const updateDoc = (ref: DocumentReference, data: any) => send(ref.firestore, [operation('update', ref, data)]);
export const setDoc = (ref: DocumentReference, data: any, options?: any) => send(ref.firestore, [operation('set', ref, data, options)]);
export const deleteDoc = (ref: DocumentReference) => send(ref.firestore, [operation('delete', ref)]);
export async function addDoc(parent: ReturnType<typeof collection>, data: any) {
  const ref = doc(parent); await setDoc(ref, data); return ref;
}
export function writeBatch(db: Firestore) {
  const operations: CatalogOperation[] = []; const id = crypto.randomUUID(); let committed = false;
  const batch = {
    set(ref: DocumentReference, data: any, options?: any) { operations.push(operation('set', ref, data, options)); return batch; },
    update(ref: DocumentReference, data: any) { operations.push(operation('update', ref, data)); return batch; },
    delete(ref: DocumentReference) { operations.push(operation('delete', ref)); return batch; },
    async commit() { if (committed) throw Error('Batch already committed.'); await send(db, operations, [], id); committed = true; },
  };
  return batch;
}
// Browser callbacks retain their business checks. The server revalidates every
// read inside its real transaction, retrying conflicts with fresh browser reads.
export async function runTransaction<T>(db: Firestore, callback: (transaction: any) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const reads: any[] = [], operations: CatalogOperation[] = [];
    const tx = {
      async get(ref: DocumentReference) { const snap = await getDocFromServer(ref); reads.push({ path: ref.path, exists: snap.exists(), data: wire(snap.data()) }); return snap; },
      set(ref: DocumentReference, data: any, options?: any) { operations.push(operation('set', ref, data, options)); return tx; },
      update(ref: DocumentReference, data: any) { operations.push(operation('update', ref, data)); return tx; },
      delete(ref: DocumentReference) { operations.push(operation('delete', ref)); return tx; },
    };
    const result = await callback(tx);
    try { await send(db, operations, reads); return result; }
    catch (error: any) { if (error.code !== 'CATALOG_CONFLICT' || attempt === 4) throw error; }
  }
  throw Error('Η καταχώρηση άλλαξε. Δοκίμασε ξανά.');
}
