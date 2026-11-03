import { createHmac, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { retrieveStripeCheckoutSession } from '../../server/stripe-service';
import { notifyOrder } from '../../server/order-notifications';

function database() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Firebase configuration missing');
  const credentials = JSON.parse(raw);
  let app = getApps().find(a => a.name === 'orders');
  if (!app) app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'orders');
  return getFirestore(app);
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const sigPart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !sigPart) return false;

    const timestamp = timestampPart.slice(2);
    const signature = sigPart.slice(3);
    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret && sigHeader) {
      const isValid = verifyStripeSignature(rawBody, sigHeader, webhookSecret);
      if (!isValid) {
        console.error('Stripe webhook signature verification failed.');
        return new Response('Invalid signature', { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'checkout.session.completed') {
      const sessionData = event.data.object;
      const sessionId = sessionData.id;

      // Double-verify directly with Stripe API
      const session = await retrieveStripeCheckoutSession(sessionId);
      if (session.payment_status !== 'paid') {
        console.warn(`Stripe session ${sessionId} payment_status is not paid: ${session.payment_status}`);
        return Response.json({ received: true, ignored: true });
      }

      const targetOrderId = session.client_reference_id || session.metadata?.orderId;
      if (!targetOrderId) {
        console.warn(`Stripe session ${sessionId} has no orderId`);
        return Response.json({ received: true, missing_order: true });
      }

      const db = database();
      const orderRef = db.doc(`orders/${targetOrderId}`);

      await db.runTransaction(async tx => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return;

        const orderData = snap.data()!;
        if (orderData.status === 'paid') return; // already processed

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
          history: [...(orderData.history || []), { status: 'paid', at: now, via: 'stripe_webhook' }]
        });
      });

      await notifyOrder(db, targetOrderId).catch((err) => {
        console.error('Failed to notify owner via webhook:', err);
      });
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('stripe-webhook processing failed:', error);
    return new Response(`Webhook Error: ${error?.message || 'unknown'}`, { status: 500 });
  }
}

