import { createHash, randomBytes } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { normalizeOrder, priceOrder, nextStatus, OrderError } from '../../server/orders-core';
import { notifyOrder } from '../../server/order-notifications';
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from '../../server/stripe-service';
import { cancelOrder, initialOrderStatus, markStripeOrderPaid, resolveStripeOrderId, reservationPatch } from '../../server/order-lifecycle';
import { cancelUnpaidCheckout, closeUnpaidStripeCheckout, hashCancelToken } from '../../server/checkout-cancellation';
import { normalizeShippingSettings } from '../../src/lib/shipping';

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
        if (status === 'cancelled') {
          const snapshot = await db.doc(`orders/${id}`).get();
          if (!snapshot.exists) throw new OrderError('Η παραγγελία δεν βρέθηκε.', 404);
          const order = snapshot.data()!;
          const result = order.paymentMethod === 'stripe' && ['pending', 'waiting_payment'].includes(order.status)
            ? await closeUnpaidStripeCheckout(db, id, order, 'admin_cancelled', notify)
            : await cancelOrder(db, id, 'admin_cancelled');
          return reply({ ok: true, ...result }, 200, origin);
        }
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
            if ((status === 'paid' || status === 'shipped') && data.status === 'Κρατημένο') {
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
        await cancelUnpaidCheckout(db, targetId, parsedBody.cancelToken, notify);
        return reply({ ok: true, cancelled: true }, 200, origin);
      }

      const input = normalizeOrder(parsedBody);
      let cancelToken = input.paymentMethod === 'stripe' ? randomBytes(32).toString('base64url') : '';
      const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      const now = new Date();
      const ref = db.doc(`orders/${input.requestId}`);
      const ipHash = createHash('sha256').update(context.ip || 'unknown').digest('hex');
      const rateRef = db.doc(`orderRateLimits/${ipHash}`);

      let stripeCheckoutUrl: string | undefined;
      const receipt = await db.runTransaction(async transaction => {
        const shopSnap = await transaction.get(db.doc('settings/shop'));
        const shopData = shopSnap.exists ? shopSnap.data() : null;
        const shippingSettings = normalizeShippingSettings(shopData?.shippingSettings);
        const customShipping = {
          boxnow: {
            cents: Math.round(shippingSettings.boxnowPrice * 100),
            free: Math.round(shippingSettings.boxnowFreeThreshold * 100)
          },
          courier: {
            cents: Math.round(shippingSettings.courierPrice * 100),
            free: Math.round(shippingSettings.courierFreeThreshold * 100)
          }
        };

        const previous = await transaction.get(ref);
        if (previous.exists) {
          const data = previous.data()!;
          if (data.requestHash !== requestHash) {
            throw new OrderError('Το αναγνωριστικό της παραγγελίας έχει ήδη χρησιμοποιηθεί με διαφορετικά στοιχεία. Δοκίμασε ξανά.', 409);
          }
          if (data.status === 'cancelled') throw new OrderError('Η προηγούμενη προσπάθεια ακυρώθηκε. Πατήστε ξανά υποβολή για νέα παραγγελία.', 409, 'ORDER_CANCELLED');
          cancelToken = data.checkoutCancelToken || '';
          stripeCheckoutUrl = ['paid', 'shipped', 'delivered'].includes(data.status) ? undefined : data.stripeCheckoutUrl;
          return {
            created: false,
            id: ref.id,
            number: data.number,
            total: data.total,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            status: data.status,
            items: data.items,
            checkoutUrl: stripeCheckoutUrl
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
          const patch = reservationPatch(product.data(), ref.id, input.items[index].quantity);
          if (patch) transaction.update(product.ref, patch);
        }

        transaction.set(rateRef, {
          count: freshWindow ? 1 : rateData!.count + 1,
          startedAt: freshWindow ? now.getTime() : rateData!.startedAt,
          expiresAt: new Date(now.getTime() + 86400000)
        });

        const orderData = {
          ...priced,
          ...(cancelToken ? { checkoutCancelTokenHash: hashCancelToken(cancelToken), checkoutCancelToken: cancelToken } : {}),
          customer: input.customer,
          shippingMethod: input.shippingMethod,
          paymentMethod: input.paymentMethod,
          number,
          status: initialOrderStatus(input.paymentMethod),
          emailNotification: input.paymentMethod === 'stripe' ? 'awaiting_payment' : 'pending',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          requestHash,
          history: [{
            status: initialOrderStatus(input.paymentMethod),
            at: now.toISOString(),
            stockMutation: 'reserve',
            orderId: ref.id,
            items: input.items.map(item => ({ id: item.id, quantity: item.quantity }))
          }]
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
          created: true,
          id: ref.id,
          number,
          total: priced.total,
          subtotal: priced.subtotal,
          shippingCost: priced.shippingCost,
          status: initialOrderStatus(input.paymentMethod),
          items: priced.items
        };
      });

      if (input.paymentMethod === 'stripe') {
        if (['paid', 'shipped', 'delivered'].includes(receipt.status)) {
          const { created: _created, ...publicReceipt } = receipt;
          return reply({ ok: true, order: publicReceipt }, 200, origin);
        }
        if (stripeCheckoutUrl) {
          const existingOrder = (await ref.get()).data()!;
          const session = await retrieveStripeCheckoutSession(existingOrder.stripeSessionId);
          resolveStripeOrderId(session, receipt.id);
          if (session.id !== existingOrder.stripeSessionId) throw new OrderError('Μη έγκυρη αντιστοίχιση πληρωμής.', 409);
          if (session.payment_status === 'paid') {
            const paidReceipt = await markStripeOrderPaid(db, receipt.id, session, 'checkout_retry');
            await notify(db, receipt.id).catch(() => console.error('Order email remains queued'));
            return reply({ ok: true, order: { ...paidReceipt, status: 'paid' } }, 200, origin);
          }
          if (session.status === 'expired') {
            await cancelOrder(db, receipt.id, 'stripe_session_expired', ['pending', 'waiting_payment']);
            throw new OrderError('Η προηγούμενη πληρωμή έληξε. Πατήστε ξανά υποβολή για νέα παραγγελία.', 409, 'ORDER_CANCELLED');
          }
          if (session.status !== 'open') throw new OrderError('Η Stripe επεξεργάζεται την πληρωμή. Μην ξεκινήσεις νέα παραγγελία.', 409);
        }
        if (!stripeCheckoutUrl) {
          if (!cancelToken) {
            throw new OrderError('Η πληρωμή της παραγγελίας προετοιμάζεται ήδη. Δοκίμασε ξανά σε λίγο.', 409);
          }
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
              origin: origin || '',
              cancelToken
            });
            stripeCheckoutUrl = session.url;
            await db.runTransaction(async tx => {
              const orderRef = db.doc(`orders/${receipt.id}`);
              const orderSnap = await tx.get(orderRef);
              const order = orderSnap.data();
              if (!orderSnap.exists || order?.status !== 'waiting_payment' || order?.requestHash !== requestHash) {
                throw new OrderError('Η παραγγελία ακυρώθηκε πριν ολοκληρωθεί η σύνδεση με τη Stripe.', 409);
              }
              tx.update(orderRef, {
                stripeSessionId: session.id,
                stripeCheckoutUrl: session.url
              });
            });
          } catch (stripeErr: any) {
            // A timeout may hide a successfully created, payable session. Preserve
            // its reservation and retry the same Stripe idempotency key.
            if (stripeErr?.code === 'STRIPE_SESSION_REJECTED') {
              await cancelOrder(db, receipt.id, 'stripe_creation_rejected', ['waiting_payment']);
              throw new OrderError(stripeErr.message, 502, 'ORDER_CANCELLED');
            }
            throw new OrderError(`${stripeErr.message || 'Η Stripe δεν απάντησε.'} Η προσπάθεια έχει αποθηκευτεί· δοκίμασε ξανά με τα ίδια στοιχεία.`, 502);
          }
        }
        const { created: _created, ...publicReceipt } = receipt;
        return reply({ ok: true, order: publicReceipt, checkoutUrl: stripeCheckoutUrl }, 201, origin);
      }

      await notify(db, receipt.id).catch(() => console.error('Order email remains queued'));
      const { created: _created, ...publicReceipt } = receipt;
      return reply({ ok: true, order: publicReceipt }, 201, origin);
    } catch (error) {
      if (error instanceof OrderError) return reply({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status, origin);
      if (error instanceof SyntaxError) return reply({ error: 'Μη έγκυρα δεδομένα.' }, 400, origin);
      console.error('Order processing failed', { name: error instanceof Error ? error.name : 'unknown', message: error instanceof Error ? error.message : '' });
      return reply({ error: error instanceof Error ? error.message : 'Η καταχώρηση δεν ολοκληρώθηκε. Δοκίμασε ξανά· το καλάθι σου παραμένει αποθηκευμένο.' }, 503, origin);
    }
  };
}
export default createOrdersHandler();
