import { createHmac, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { retrieveStripeCheckoutSession } from '../../server/stripe-service';
import { notifyOrder } from '../../server/order-notifications';
import { cancelOrder, markStripeOrderPaid } from '../../server/order-lifecycle';

function database() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Firebase configuration missing');
  const credentials = JSON.parse(raw);
  let app = getApps().find(a => a.name === 'orders');
  if (!app) app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'orders');
  return getFirestore(app);
}

export function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): boolean {
  try {
    const parts = header.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const sigPart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !sigPart) return false;

    const timestamp = timestampPart.slice(2);
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(now / 1000 - timestampSeconds) > 300) return false;
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

    if (!webhookSecret) return new Response('Webhook configuration missing', { status: 503 });
    if (!sigHeader || !verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
      console.error('Stripe webhook signature verification failed.');
      return new Response('Invalid signature', { status: 400 });
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
      await markStripeOrderPaid(db, targetOrderId, session, 'stripe_webhook');

      await notifyOrder(db, targetOrderId).catch((err) => {
        console.error('Failed to notify owner via webhook:', err);
      });
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const targetOrderId = session.client_reference_id || session.metadata?.orderId;
      if (targetOrderId) await cancelOrder(database(), targetOrderId, 'stripe_checkout_expired', ['waiting_payment', 'pending']);
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('stripe-webhook processing failed:', error);
    return new Response(`Webhook Error: ${error?.message || 'unknown'}`, { status: 500 });
  }
}

