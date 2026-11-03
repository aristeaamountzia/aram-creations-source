import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { retrieveStripeCheckoutSession } from '../../server/stripe-service';
import { notifyOrder } from '../../server/order-notifications';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const configured = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'https://aramcreationsofficial1.netlify.app',
    'https://aramcreationss.netlify.app',
    'https://aram-creations.netlify.app',
    'http://localhost:5173',
    'http://localhost:8888',
    'http://localhost:3000'
  ].filter(Boolean) as string[];

  if (configured.some(allowed => origin === allowed || origin === allowed.replace(/\/$/, ''))) return true;
  if (/^https:\/\/(?:[a-z0-9-]+--)?(?:aramcreationsofficial1|aramcreationss|aram-creations)\.netlify\.app$/i.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = isAllowedOrigin(origin) ? (origin || '*') : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  if (!raw) throw new Error('Firebase configuration missing');
  const credentials = JSON.parse(raw);
  let app = getApps().find(a => a.name === 'orders');
  if (!app) app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'orders');
  return getFirestore(app);
}

export default async function handler(request: Request) {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return reply({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, orderId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return reply({ error: 'Απαιτείται αναγνωριστικό συνεδρίας Stripe (sessionId).' }, 400, origin);
    }

    const session = await retrieveStripeCheckoutSession(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return reply({
        ok: false,
        status: session?.payment_status || 'unpaid',
        message: 'Η πληρωμή δεν έχει επιβεβαιωθεί ακόμη από τη Stripe.'
      }, 400, origin);
    }

    const targetOrderId = orderId || session.client_reference_id || session.metadata?.orderId;
    if (!targetOrderId) {
      return reply({ error: 'Δεν βρέθηκε αντιστοιχισμένη παραγγελία για αυτή τη συνεδρία.' }, 400, origin);
    }

    const db = database();
    const orderRef = db.doc(`orders/${targetOrderId}`);

    const confirmed = await db.runTransaction(async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) {
        throw new Error('Η παραγγελία δεν βρέθηκε.');
      }

      const orderData = snap.data()!;
      if (orderData.status === 'paid') {
        return {
          id: targetOrderId,
          number: orderData.number,
          total: orderData.total,
          alreadyPaid: true
        };
      }

      // Mark items as sold
      if (Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          const itemRef = db.doc(`jewelry/${item.id}`);
          const itemSnap = await tx.get(itemRef);
          if (itemSnap.exists) {
            tx.update(itemRef, {
              status: 'Πουλήθηκε',
              stock: 0,
              [`checkoutReservations.${targetOrderId}`]: FieldValue.delete()
            });
          }
        }
      }

      const now = new Date().toISOString();
      tx.update(orderRef, {
        status: 'paid',
        paidAt: now,
        updatedAt: now,
        stripePaymentIntent: session.payment_intent || '',
        stripeSessionId: session.id,
        history: [...(orderData.history || []), { status: 'paid', at: now, via: 'stripe' }]
      });

      return {
        id: targetOrderId,
        number: orderData.number,
        total: orderData.total,
        alreadyPaid: false
      };
    });

    // Send email notification to owner if not already sent
    await notifyOrder(db, confirmed.id).catch((err) => {
      console.error('Failed to notify owner for paid Stripe order:', err);
    });

    return reply({
      ok: true,
      paid: true,
      orderNumber: confirmed.number,
      total: confirmed.total
    }, 200, origin);
  } catch (error: any) {
    console.error('stripe-confirm error:', error);
    return reply({
      error: error?.message || 'Σφάλμα κατά την επιβεβαίωση της πληρωμής.'
    }, 500, origin);
  }
}

