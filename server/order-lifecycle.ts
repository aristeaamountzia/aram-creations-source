import { FieldValue } from 'firebase-admin/firestore';
import { OrderError } from './orders-core';

export type StripeSession = {
  id: string;
  payment_intent?: string | null;
  client_reference_id?: string | null;
  metadata?: { orderId?: string } | null;
};

export function resolveStripeOrderId(session: StripeSession, requestedOrderId?: string) {
  const sessionOrderId = session.client_reference_id || session.metadata?.orderId;
  if (!sessionOrderId) throw new OrderError('Δεν βρέθηκε αντιστοιχισμένη παραγγελία για αυτή τη συνεδρία.', 400);
  if (requestedOrderId && requestedOrderId !== sessionOrderId) {
    throw new OrderError('Η συνεδρία Stripe δεν αντιστοιχεί στην παραγγελία.', 409);
  }
  return sessionOrderId;
}

export function initialOrderStatus(paymentMethod: string) {
  return paymentMethod === 'stripe' ? 'waiting_payment' : 'pending';
}

export function reservationPatch(product: any, orderId: string, quantity: number) {
  const existing = Number(product?.checkoutReservations?.[orderId] || 0);
  if (existing) {
    if (existing !== quantity) throw new OrderError('Η υπάρχουσα δέσμευση αποθέματος δεν συμφωνεί με την παραγγελία.', 409);
    return null;
  }
  const stock = Number(product?.stock ?? product?.stockCount ?? 1);
  if (!Number.isInteger(stock) || stock < quantity) throw new OrderError('Το προϊόν δεν έχει επαρκές απόθεμα.', 409);
  const nextStock = stock - quantity;
  return {
    stock: nextStock,
    [`checkoutReservations.${orderId}`]: quantity,
    status: nextStock === 0 ? 'Κρατημένο' : 'Διαθέσιμο'
  };
}

export function releasePatch(product: any, orderId: string) {
  const reserved = Number(product?.checkoutReservations?.[orderId] || 0);
  if (!Number.isInteger(reserved) || reserved <= 0) return null;
  const stock = Number(product?.stock ?? 0);
  return {
    stock: stock + reserved,
    [`checkoutReservations.${orderId}`]: FieldValue.delete(),
    status: 'Διαθέσιμο',
    restored: reserved
  };
}

export function paidPatch(product: any, orderId: string) {
  const reserved = Number(product?.checkoutReservations?.[orderId] || 0);
  if (!Number.isInteger(reserved) || reserved <= 0) {
    throw new OrderError('Δεν βρέθηκε ενεργή δέσμευση αποθέματος για την παραγγελία.', 409);
  }
  return { status: Number(product?.stock || 0) > 0 ? 'Διαθέσιμο' : 'Πουλήθηκε' };
}

export async function markStripeOrderPaid(db: any, orderId: string, session: StripeSession, via: string) {
  return db.runTransaction(async (tx: any) => {
    const orderRef = db.doc(`orders/${orderId}`);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new OrderError('Η παραγγελία δεν βρέθηκε.', 404);
    const order = orderSnap.data();
    if (order.status === 'paid') return { id: orderId, number: order.number, total: order.total, alreadyPaid: true };
    if (!['pending', 'waiting_payment'].includes(order.status) || order.paymentMethod !== 'stripe') {
      throw new OrderError('Η παραγγελία δεν μπορεί να επιβεβαιωθεί ως πληρωμένη.', 409);
    }
    if (order.stripeSessionId && order.stripeSessionId !== session.id) {
      throw new OrderError('Η συνεδρία Stripe δεν αντιστοιχεί στην παραγγελία.', 409);
    }

    for (const item of Array.isArray(order.items) ? order.items : []) {
      const productRef = db.doc(`jewelry/${item.id}`);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) throw new OrderError(`Το προϊόν ${item.id} δεν βρέθηκε.`, 409);
      tx.update(productRef, paidPatch(productSnap.data(), orderId));
    }

    const now = new Date().toISOString();
    tx.update(orderRef, {
      status: 'paid',
      paidAt: now,
      updatedAt: now,
      stripePaymentIntent: session.payment_intent || '',
      stripeSessionId: session.id,
      history: [...(order.history || []), { status: 'paid', at: now, via, stockMutation: 'commit_reservation', orderId }]
    });
    return { id: orderId, number: order.number, total: order.total, alreadyPaid: false };
  });
}

export async function cancelOrder(db: any, orderId: string, reason: string, allowedStatuses = ['pending', 'waiting_payment', 'paid']) {
  return db.runTransaction(async (tx: any) => {
    const orderRef = db.doc(`orders/${orderId}`);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new OrderError('Η παραγγελία δεν βρέθηκε.', 404);
    const order = orderSnap.data();
    if (order.status === 'cancelled') return { alreadyCancelled: true, restored: 0 };
    if (!allowedStatuses.includes(order.status)) throw new OrderError('Η παραγγελία δεν μπορεί να ακυρωθεί.', 409);

    let restored = 0;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const productRef = db.doc(`jewelry/${item.id}`);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) continue;
      const patch = releasePatch(productSnap.data(), orderId);
      if (patch) {
        restored += patch.restored;
        const { restored: _restored, ...update } = patch;
        tx.update(productRef, update);
      }
    }

    const now = new Date().toISOString();
    tx.update(orderRef, {
      status: 'cancelled',
      emailNotification: 'cancelled',
      updatedAt: now,
      history: [...(order.history || []), { status: 'cancelled', at: now, reason, stockMutation: 'release_reservation', orderId, restored }]
    });
    tx.delete(db.doc(`orderNotifications/${orderId}`));
    return { alreadyCancelled: false, restored };
  });
}
