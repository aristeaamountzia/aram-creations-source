import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { normalizeOrder, priceOrder, nextStatus, OrderError } from '../../server/orders-core';
import { notifyOrder } from '../../server/order-notifications';

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function database() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new OrderError('Η καταχώρηση παραγγελιών δεν είναι ακόμη διαθέσιμη.', 503);
  const credentials = JSON.parse(raw);
  if (credentials.project_id !== 'aramcreations-e1529') throw new Error('Incorrect Firebase project');
  let app = getApps().find(app => app.name === 'orders');
  if (!app) app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'orders');
  return { db: getFirestore(app), auth: getAuth(app) };
}

export function createOrdersHandler(connect: typeof database = database, notify: typeof notifyOrder = notifyOrder) {
return async function handler(request: Request, context: { ip?: string }) {
  try {
    const { db, auth } = connect();
    const url = new URL(request.url);
    if (request.method === 'GET' || request.method === 'PATCH') {
      const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return reply({ error: 'Απαιτείται σύνδεση διαχειριστή.' }, 401);
      const user = await auth.verifyIdToken(token).catch(() => null);
      if (!user || !(user.admin === true || user.email?.toLowerCase() === 'aristeaamnta@gmail.com')) return reply({ error: 'Δεν επιτρέπεται η πρόσβαση.' }, 403);
      if (request.method === 'GET') {
        let query = db.collection('orders').orderBy('createdAt', 'desc').limit(100);
        const cursor = url.searchParams.get('after');
        if (cursor && /^[a-f0-9-]{36}$/.test(cursor)) {
          const last = await db.doc(`orders/${cursor}`).get();
          if (last.exists) query = query.startAfter(last);
        }
        const result = await query.get();
        return reply({ orders: result.docs.map(doc => ({ ...doc.data(), id: doc.id })), nextCursor: result.size === 100 ? result.docs.at(-1)?.id : null });
      }
      const { id, status, tracking } = await request.json();
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new OrderError('Μη έγκυρη παραγγελία.');
      await db.runTransaction(async transaction => {
        const ref = db.doc(`orders/${id}`);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) throw new OrderError('Η παραγγελία δεν βρέθηκε.', 404);
        const order = snapshot.data()!;
        nextStatus(order.status, status, order.paymentMethod);
        const products = await Promise.all(order.items.map((item: { id: string }) => transaction.get(db.doc(`jewelry/${item.id}`))));
        for (const product of products) {
          if (!product.exists) continue;
          const data = product.data()!;
          const reserved = Number(data.checkoutReservations?.[id] || 0);
          if (!reserved) continue;
          if (status === 'cancelled') {
            transaction.update(product.ref, { stock: 1, [`checkoutReservations.${id}`]: FieldValue.delete(), ...(data.status === 'Κρατημένο' || data.status === 'Πουλήθηκε' ? { status: 'Διαθέσιμο' } : {}) });
          } else if ((status === 'paid' || status === 'shipped') && Number(data.stock) === 0 && data.status === 'Κρατημένο') {
            transaction.update(product.ref, { status: 'Πουλήθηκε' });
          } else if (status === 'delivered') {
            transaction.update(product.ref, { [`checkoutReservations.${id}`]: FieldValue.delete() });
          }
        }
        transaction.update(ref, { status, tracking: typeof tracking === 'string' ? tracking.slice(0, 200) : order.tracking || '', updatedAt: new Date().toISOString(), history: [...(order.history || []), { status, at: new Date().toISOString(), by: user.uid }] });
      });
      return reply({ ok: true });
    }
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const origin = request.headers.get('origin');
    if (origin && !/^https:\/\/(?:[a-f0-9]+--)?lovely-bienenstitch-b6079c\.netlify\.app$/.test(origin) && origin !== 'https://aram-creations.netlify.app') return reply({ error: 'Μη επιτρεπόμενη προέλευση.' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new OrderError('Απαιτούνται δεδομένα JSON.');
    const text = await request.text();
    if (text.length > 16000) throw new OrderError('Το αίτημα είναι πολύ μεγάλο.');
    const input = normalizeOrder(JSON.parse(text));
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const now = new Date();
    const ref = db.doc(`orders/${input.requestId}`);
    const ipHash = createHash('sha256').update(context.ip || 'unknown').digest('hex');
    const rateRef = db.doc(`orderRateLimits/${ipHash}`);
    const receipt = await db.runTransaction(async transaction => {
      const previous = await transaction.get(ref);
      if (previous.exists) {
        const data = previous.data()!;
        if (data.requestHash !== requestHash) throw new OrderError('Το αίτημα έχει αλλάξει. Δοκίμασε ξανά.', 409);
        return { id: ref.id, number: data.number, total: data.total, subtotal: data.subtotal, shippingCost: data.shippingCost, status: data.status };
      }
      const rate = await transaction.get(rateRef);
      const rateData = rate.data();
      const freshWindow = !rateData || now.getTime() - rateData.startedAt > 3600000;
      if (!freshWindow && rateData.count >= 8) throw new OrderError('Έγιναν πολλά αιτήματα. Δοκίμασε αργότερα ή επικοινώνησε μαζί μας.', 429);
      const snapshots = await Promise.all(input.items.map(item => transaction.get(db.doc(`jewelry/${item.id}`))));
      const priced = priceOrder(input, snapshots.map(doc => doc.exists ? { ...doc.data(), id: doc.id } : null));
      if (Math.round(priced.total * 100) !== input.expectedTotalCents) throw new OrderError('Η τιμή ή τα μεταφορικά άλλαξαν. Έλεγξε το νέο σύνολο στο καλάθι και δοκίμασε ξανά.', 409);
      const number = `ARAM-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${input.requestId.slice(0, 8).toUpperCase()}`;
      for (let index = 0; index < snapshots.length; index++) {
        const product = snapshots[index];
        const data = product.data()!;
        const remaining = 0;
        transaction.update(product.ref, { stock: remaining, [`checkoutReservations.${ref.id}`]: input.items[index].quantity, ...(remaining === 0 ? { status: 'Κρατημένο' } : {}) });
      }
      transaction.set(rateRef, { count: freshWindow ? 1 : rateData!.count + 1, startedAt: freshWindow ? now.getTime() : rateData!.startedAt, expiresAt: new Date(now.getTime() + 86400000) });
      transaction.create(ref, { ...priced, customer: input.customer, shippingMethod: input.shippingMethod, paymentMethod: input.paymentMethod, number, status: 'pending', emailNotification: 'pending', createdAt: now.toISOString(), updatedAt: now.toISOString(), requestHash, history: [{ status: 'pending', at: now.toISOString() }] });
      transaction.create(db.doc(`orderNotifications/${ref.id}`), { state: 'pending', payload: { number, total: priced.total }, createdAt: now.toISOString() });
      return { id: ref.id, number, total: priced.total, subtotal: priced.subtotal, shippingCost: priced.shippingCost, status: 'pending' };
    });
    await notify(db, receipt.id).catch(() => console.error('Order email remains queued'));
    return reply({ ok: true, order: receipt }, 201);
  } catch (error) {
    if (error instanceof OrderError) return reply({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return reply({ error: 'Μη έγκυρα δεδομένα.' }, 400);
    console.error('Order processing failed', { name: error instanceof Error ? error.name : 'unknown' });
    return reply({ error: 'Η καταχώρηση δεν ολοκληρώθηκε. Δοκίμασε ξανά· το καλάθι σου παραμένει αποθηκευμένο.' }, 503);
  }
}
}
export default createOrdersHandler();
