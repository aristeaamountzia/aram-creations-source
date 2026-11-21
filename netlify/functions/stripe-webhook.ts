import { createHmac, timingSafeEqual } from 'node:crypto';
import { adminDatabase } from '../../server/admin-database';
import { retrieveStripeCheckoutSession } from '../../server/stripe-service';
import { notifyOrder } from '../../server/order-notifications';
import { cancelOrder, markStripeOrderPaid } from '../../server/order-lifecycle';

export function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): boolean {
  try {
    const parts = header.split(',').map(part => part.trim());
    const timestampPart = parts.find(p => p.startsWith('t='));
    if (!timestampPart) return false;

    const timestamp = timestampPart.slice(2);
    const timestampSeconds = Number(timestamp);
    if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(timestampSeconds) || Math.abs(now / 1000 - timestampSeconds) > 300) return false;
    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

    return parts.some(part => {
      if (!/^v1=[a-f\d]{64}$/i.test(part)) return false;
      return timingSafeEqual(Buffer.from(part.slice(3), 'hex'), Buffer.from(expected, 'hex'));
    });
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) return new Response('Webhook configuration missing', { status: 503 });
    if (!sigHeader || !verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
      console.error('Stripe webhook signature verification failed.');
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
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

      const { db } = adminDatabase();
      await markStripeOrderPaid(db, targetOrderId, session, 'stripe_webhook');

      await notifyOrder(db, targetOrderId).catch((err) => {
        console.error('Failed to notify owner via webhook:', err);
      });
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const deliveredSession = event.data.object;
      const targetOrderId = deliveredSession.client_reference_id || deliveredSession.metadata?.orderId;
      const reason = event.type === 'checkout.session.expired' ? 'stripe_checkout_expired' : 'stripe_async_payment_failed';
      if (targetOrderId && typeof deliveredSession.id === 'string' && deliveredSession.id) {
        const session = await retrieveStripeCheckoutSession(deliveredSession.id);
        if (session.payment_status === 'paid' || (event.type === 'checkout.session.expired' && session.status !== 'expired')) {
          return Response.json({ received: true, ignored: true });
        }
        const { db } = adminDatabase();
        await cancelOrder(db, targetOrderId, reason, ['waiting_payment', 'pending'], session.id);
      }
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook could not process event.', { name: error?.name, status: error?.status });
    return new Response('Webhook processing failed', { status: 500 });
  }
}

