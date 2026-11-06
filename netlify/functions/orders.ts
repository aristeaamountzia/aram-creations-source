import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { normalizeOrder, priceOrder, nextStatus, OrderError } from '../../server/orders-core';
import { notifyOrder } from '../../server/order-notifications';
import { createStripeCheckoutSession } from '../../server/stripe-service';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const configured = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'https://aramcreationsofficial.netlify.app',
    'http://localhost:5173',
    'http://localhost:8888',
    'http://localhost:3000'
  ].filter(Boolean) as string[];

  if (configured.some(allowed => origin === allowed || origin === allowed.replace(/\/$/, ''))) return true;
  if (/^https:\/\/(?:[a-z0-9-]+--)?aramcreationsofficial\.netlify\.app$/i.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = isAllowedOrigin(origin) ? (origin || '*') : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

const reply = (data: unknown, status = 200, origin: string | null = null) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });

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
    const origin = request.headers.get('origin');
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      const { db, auth } = connect();
      const url = new URL(request.url);

      if (request.method === 'GET' || request.method === 'PATCH') {
        const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
        if (!token) return reply({ error: 'Απαιτείται σύνδεση διαχειριστή.' }, 401, origin);
        const user = await auth.verifyIdToken(token).catch(() => null);
        const adminEmail = (process.env.ADMIN_EMAIL || 'aristeaamnta@gmail.com').toLowerCase();
        if (!user || !(user.admin === true || user.email?.toLowerCase() === adminEmail)) {
          return reply({ error: 'Δεν επιτρέπεται η πρόσβαση.' }, 403, origin);
        }

        if (request.method === 'GET') {
          let query = db.collection('orders').orderBy('createdAt', 'desc').limit(100);
          const cursor = url.searchParams.get('after');
          if (cursor && /^[a-f0-9-]{36}$/.test(cursor)) {
            const last = await db.doc(`orders/${cursor}`).get();
            if (last.exists) query = query.startAfter(last);
          }
          const result = await query.get();
          return reply({
            orders: result.docs.map(doc => ({ ...doc.data(), id: doc.id })),
            nextCursor: result.size === 100 ? result.docs.at(-1)?.id : null
          }, 200, origin);
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
              transaction.update(product.ref, {
                stock: 1,
                [`checkoutReservations.${id}`]: FieldValue.delete(),
                ...(data.status === 'Κρατημένο' || data.status === 'Πουλήθηκε' ? { status: 'Διαθέσιμο' } : {})
              });
            } else if ((status === 'paid' || status === 'shipped') && Number(data.stock) === 0 && data.status === 'Κρατημένο') {
              transaction.update(product.ref, { status: 'Πουλήθηκε' });
            } else if (status === 'delivered') {
              transaction.update(product.ref, { [`checkoutReservations.${id}`]: FieldValue.delete() });
            }
          }
          transaction.update(ref, {
            status,
            tracking: typeof tracking === 'string' ? tracking.slice(0, 200) : order.tracking || '',
            updatedAt: new Date().toISOString(),
            history: [...(order.history || []), { status, at: new Date().toISOString(), by: user.uid }]
          });
          if (status === 'cancelled') {
            transaction.delete(db.doc(`orderNotifications/${id}`));
          }
        });
        return reply({ ok: true }, 200, origin);
      }

      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405, origin);

      if (origin && !isAllowedOrigin(origin)) {
        return reply({ error: 'Μη επιτρεπόμενη προέλευση.' }, 403, origin);
      }

      if (!request.headers.get('content-type')?.includes('application/json')) {
        throw new OrderError('Απαιτούνται δεδομένα JSON.');
      }
      const text = await request.text();
      if (text.length > 16000) throw new OrderError('Το αίτημα είναι πολύ μεγάλο.');
      const parsedBody = JSON.parse(text);

      // Handle cancel_unpaid action when customer cancels checkout or payment fails
      if (parsedBody?.action === 'cancel_unpaid' && typeof parsedBody.orderId === 'string' && /^[a-f0-9-]{36}$/.test(parsedBody.orderId)) {
        const targetId = parsedBody.orderId;
        await db.runTransaction(async tx => {
          const oRef = db.doc(`orders/${targetId}`);
          const oSnap = await tx.get(oRef);
          if (!oSnap.exists) return;
          const order = oSnap.data()!;
          if (order.status !== 'pending' && order.status !== 'cancelled') return;

          if (Array.isArray(order.items)) {
            for (const it of order.items) {
              const pRef = db.doc(`jewelry/${it.id}`);
              const pSnap = await tx.get(pRef);
              if (pSnap.exists) {
                const pData = pSnap.data()!;
                const isOnlyReservation = Object.keys(pData.checkoutReservations || {}).every(k => k === targetId || !pData.checkoutReservations?.[k]);
                tx.update(pRef, {
                  ...(order.status === 'pending' || (pData.status === 'Κρατημένο' && isOnlyReservation)
                    ? { stock: 1, status: 'Διαθέσιμο' }
                    : {}),
                  [`checkoutReservations.${targetId}`]: FieldValue.delete()
                });
              }
            }
          }
          if (order.status === 'pending') {
            const nowIso = new Date().toISOString();
            tx.update(oRef, {
              status: 'cancelled',
              updatedAt: nowIso,
              history: [...(order.history || []), { status: 'cancelled', at: nowIso, reason: 'customer_checkout_cancelled' }]
            });
          }
          tx.delete(db.doc(`orderNotifications/${targetId}`));
        });
        return reply({ ok: true, cancelled: true }, 200, origin);
      }

      const input = normalizeOrder(parsedBody);
      const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      const now = new Date();
      const ref = db.doc(`orders/${input.requestId}`);
      const ipHash = createHash('sha256').update(context.ip || 'unknown').digest('hex');
      const rateRef = db.doc(`orderRateLimits/${ipHash}`);

      let stripeCheckoutUrl: string | undefined;
      const receipt = await db.runTransaction(async transaction => {
        const shopSnap = await transaction.get(db.doc('settings/shop'));
        const shopData = shopSnap.exists ? shopSnap.data() : null;
        const customShipping = shopData?.shippingSettings ? {
          boxnow: {
            cents: Math.round((Number(shopData.shippingSettings.boxnowPrice) || 2.5) * 100),
            free: Math.round((Number(shopData.shippingSettings.boxnowFreeThreshold) || 45) * 100)
          },
          courier: {
            cents: Math.round((Number(shopData.shippingSettings.courierPrice) || 4.0) * 100),
            free: Math.round((Number(shopData.shippingSettings.courierFreeThreshold) || 50) * 100)
          }
        } : undefined;

        const previous = await transaction.get(ref);
        if (previous.exists) {
          const data = previous.data()!;
          if (data.status === 'pending' && data.requestHash !== requestHash) {
            // Pending order being retried with modified details: update it
            const snapshots = await Promise.all(input.items.map(item => transaction.get(db.doc(`jewelry/${item.id}`))));
            const priced = priceOrder(input, snapshots.map(doc => doc.exists ? { ...doc.data(), id: doc.id } : null), customShipping);
            if (Math.round(priced.total * 100) !== input.expectedTotalCents) {
              throw new OrderError('Η τιμή ή τα μεταφορικά άλλαξαν. Έλεγξε το νέο σύνολο στο καλάθι και δοκίμασε ξανά.', 409);
            }
            transaction.update(ref, {
              ...priced,
              customer: input.customer,
              shippingMethod: input.shippingMethod,
              paymentMethod: input.paymentMethod,
              requestHash,
              updatedAt: now.toISOString()
            });
            return {
              id: ref.id,
              number: data.number,
              total: priced.total,
              subtotal: priced.subtotal,
              shippingCost: priced.shippingCost,
              status: 'pending',
              items: priced.items,
              checkoutUrl: undefined
            };
          }
          if (data.requestHash !== requestHash) {
            throw new OrderError('Το αίτημα έχει αλλάξει. Δοκίμασε ξανά.', 409);
          }
          stripeCheckoutUrl = data.stripeCheckoutUrl;
          return {
            id: ref.id,
            number: data.number,
            total: data.total,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            status: data.status,
            items: data.items,
            checkoutUrl: data.stripeCheckoutUrl
          };
        }

        const rate = await transaction.get(rateRef);
        const rateData = rate.data();
        const freshWindow = !rateData || now.getTime() - rateData.startedAt > 3600000;
        if (!freshWindow && rateData.count >= 15) {
          throw new OrderError('Έγιναν πολλά αιτήματα. Δοκίμασε αργότερα ή επικοινώνησε μαζί μας.', 429);
        }

        const snapshots = await Promise.all(input.items.map(item => transaction.get(db.doc(`jewelry/${item.id}`))));
        const priced = priceOrder(input, snapshots.map(doc => doc.exists ? { ...doc.data(), id: doc.id } : null), customShipping);
        if (Math.round(priced.total * 100) !== input.expectedTotalCents) {
          throw new OrderError('Η τιμή ή τα μεταφορικά άλλαξαν. Έλεγξε το νέο σύνολο στο καλάθι και δοκίμασε ξανά.', 409);
        }

        const number = `ARAM-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${input.requestId.slice(0, 8).toUpperCase()}`;
        for (let index = 0; index < snapshots.length; index++) {
          const product = snapshots[index];
          transaction.update(product.ref, {
            stock: 0,
            checkoutReservations: { [ref.id]: input.items[index].quantity },
            status: 'Κρατημένο'
          });
        }

        transaction.set(rateRef, {
          count: freshWindow ? 1 : rateData!.count + 1,
          startedAt: freshWindow ? now.getTime() : rateData!.startedAt,
          expiresAt: new Date(now.getTime() + 86400000)
        });

        const orderData = {
          ...priced,
          customer: input.customer,
          shippingMethod: input.shippingMethod,
          paymentMethod: input.paymentMethod,
          number,
          status: 'pending',
          emailNotification: 'pending',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          requestHash,
          history: [{ status: 'pending', at: now.toISOString() }]
        };

        transaction.create(ref, orderData);
        transaction.create(db.doc(`orderNotifications/${ref.id}`), {
          state: input.paymentMethod === 'stripe' ? 'awaiting_payment' : 'pending',
          payload: {
            ...orderData,
            id: ref.id
          },
          createdAt: now.toISOString()
        });

        return {
          id: ref.id,
          number,
          total: priced.total,
          subtotal: priced.subtotal,
          shippingCost: priced.shippingCost,
          status: 'pending',
          items: priced.items
        };
      });

      if (input.paymentMethod === 'stripe') {
        if (!stripeCheckoutUrl) {
          try {
            const session = await createStripeCheckoutSession({
              orderId: receipt.id,
              orderNumber: receipt.number,
              items: (receipt.items || []).map((it: any) => ({
                name: it.name || 'Χειροποίητο κόσμημα',
                price: it.price,
                quantity: it.quantity,
                imageUrl: it.imageUrl
              })),
              shippingMethod: input.shippingMethod,
              shippingCost: receipt.shippingCost,
              customerEmail: input.customer.email,
              origin: origin || ''
            });
            stripeCheckoutUrl = session.url;
            await db.doc(`orders/${receipt.id}`).update({
              stripeSessionId: session.id,
              stripeCheckoutUrl: session.url
            });
          } catch (stripeErr: any) {
            console.error('Stripe session creation error, rolling back reservation:', stripeErr);
            // Roll back the reservation immediately so products are not left locked!
            await db.runTransaction(async tx => {
              for (const it of receipt.items || []) {
                const pRef = db.doc(`jewelry/${it.id}`);
                const pSnap = await tx.get(pRef);
                if (pSnap.exists) {
                  tx.update(pRef, {
                    stock: 1,
                    status: 'Διαθέσιμο',
                    [`checkoutReservations.${ref.id}`]: FieldValue.delete()
                  });
                }
              }
              tx.delete(ref);
              tx.delete(db.doc(`orderNotifications/${ref.id}`));
            }).catch(e => console.error('Rollback failed:', e));

            throw new OrderError(stripeErr.message || 'Αποτυχία αρχικοποίησης πληρωμής στη Stripe. Δοκιμάστε ξανά.', 502);
          }
        }
        return reply({ ok: true, order: receipt, checkoutUrl: stripeCheckoutUrl }, 201, origin);
      }

      await notify(db, receipt.id).catch(() => console.error('Order email remains queued'));
      return reply({ ok: true, order: receipt }, 201, origin);
    } catch (error) {
      if (error instanceof OrderError) return reply({ error: error.message }, error.status, origin);
      if (error instanceof SyntaxError) return reply({ error: 'Μη έγκυρα δεδομένα.' }, 400, origin);
      console.error('Order processing failed', { name: error instanceof Error ? error.name : 'unknown', message: error instanceof Error ? error.message : '' });
      return reply({ error: error instanceof Error ? error.message : 'Η καταχώρηση δεν ολοκληρώθηκε. Δοκίμασε ξανά· το καλάθι σου παραμένει αποθηκευμένο.' }, 503, origin);
    }
  };
}
export default createOrdersHandler();
