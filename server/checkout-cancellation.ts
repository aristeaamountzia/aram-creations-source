import { createHash, timingSafeEqual } from 'node:crypto';
import { OrderError } from './orders-core';
import { cancelOrder, markStripeOrderPaid, resolveStripeOrderId } from './order-lifecycle';
import { retrieveStripeCheckoutSession, expireStripeCheckoutSession } from './stripe-service';
import { notifyOrder } from './order-notifications';

export const hashCancelToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function cancelUnpaidCheckout(
  db: any,
  orderId: string,
  token: unknown,
  notify: typeof notifyOrder = notifyOrder,
  gateway = { retrieve: retrieveStripeCheckoutSession, expire: expireStripeCheckoutSession }
) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new OrderError('Δεν επιβεβαιώθηκε ο σύνδεσμος ακύρωσης της παραγγελίας.', 403);
  const snapshot = await db.doc(`orders/${orderId}`).get();
  const order = snapshot.data();
  const expected = Buffer.from(order?.checkoutCancelTokenHash || '');
  const supplied = Buffer.from(hashCancelToken(token));
  if (!snapshot.exists || expected.length !== supplied.length || !timingSafeEqual(expected, supplied) || order.paymentMethod !== 'stripe') {
    throw new OrderError('Δεν επιβεβαιώθηκε ο σύνδεσμος ακύρωσης της παραγγελίας.', 403);
  }
  if (order.status === 'cancelled') return { alreadyCancelled: true, restored: 0 };
  if (!['pending', 'waiting_payment'].includes(order.status)) throw new OrderError('Η παραγγελία έχει ήδη προχωρήσει και δεν ακυρώθηκε.', 409);
  if (!order.stripeSessionId) throw new OrderError('Η συνεδρία πληρωμής προετοιμάζεται. Δοκίμασε ξανά σε λίγο.', 409);

  return closeUnpaidStripeCheckout(db, orderId, order, 'customer_checkout_cancelled', notify, gateway);
}

/** Close the payable Stripe session before returning any reserved stock. */
export async function closeUnpaidStripeCheckout(db: any, orderId: string, order: any, reason: string,
  notify: typeof notifyOrder = notifyOrder,
  gateway = { retrieve: retrieveStripeCheckoutSession, expire: expireStripeCheckoutSession }) {
  if (!order.stripeSessionId) throw new OrderError('Η συνεδρία πληρωμής προετοιμάζεται. Δοκίμασε ξανά σε λίγο.', 409);
  const verify = (session: any) => {
    resolveStripeOrderId(session, orderId);
    if (session.id !== order.stripeSessionId) throw new OrderError('Η συνεδρία Stripe δεν αντιστοιχεί στην παραγγελία.', 409);
  };
  const paid = async (session: any): Promise<never> => {
    await markStripeOrderPaid(db, orderId, session, 'checkout_cancel_check');
    await notify(db, orderId).catch(() => console.error('Order email remains queued'));
    throw new OrderError('Η πληρωμή έχει ήδη ολοκληρωθεί και η παραγγελία επιβεβαιώθηκε. Μην κάνεις νέα πληρωμή.', 409);
  };
  let session = await gateway.retrieve(order.stripeSessionId);
  verify(session);
  if (session.payment_status === 'paid') return paid(session);
  if (session.status === 'open') {
    try { session = await gateway.expire(session.id); verify(session); }
    catch (error) {
      const latest = await gateway.retrieve(order.stripeSessionId);
      verify(latest);
      if (latest.payment_status === 'paid') return paid(latest);
      if (latest.status !== 'expired') throw error;
      session = latest;
    }
  }
  if (session.status !== 'expired') throw new OrderError('Η συνεδρία πληρωμής έχει ολοκληρωθεί ή εκκρεμεί έλεγχος. Η παραγγελία δεν ακυρώθηκε.', 409);
  return cancelOrder(db, orderId, reason, ['pending', 'waiting_payment']);
}
