import type { Firestore } from 'firebase-admin/firestore';

export const OWNER_EMAIL = 'aristeaamnta@gmail.com';
export const CANONICAL_SITE_URL = 'https://aramcreationsofficial.netlify.app';

export function resolveAdminUrl(candidate?: string): string {
  const raw = (candidate || process.env.PUBLIC_SITE_URL || process.env.URL || CANONICAL_SITE_URL).trim().replace(/\/$/, '');
  if (!raw) {
    return `${CANONICAL_SITE_URL}/#admin`;
  }
  return `${raw}/#admin`;
}

export async function sendOrderEmail(id: string, payload: any, send = fetch) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('MAIL_NOT_CONFIGURED');
  const adminUrl = resolveAdminUrl(payload?.siteOrigin);
  const customer = payload.customer || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const itemsText = items.map((it: any) => `• ${it.name || 'Χειροποίητο κόσμημα'} (x${it.quantity || 1}) — €${Number(it.price || 0).toFixed(2)}${it.customInscription ? ` [Χάραξη: ${it.customInscription}]` : ''}`).join('\n');
  const shippingLabel = payload.shippingMethod === 'boxnow' ? 'BoxNow Locker 24/7' : payload.shippingMethod === 'courier' ? 'Courier (ACS / Speedex)' : (payload.shippingMethod || 'Standard');
  const paymentLabel = payload.paymentMethod === 'stripe' ? 'Stripe (Κάρτα / Apple Pay / Google Pay / Revolut)' : payload.paymentMethod === 'iris' ? 'IRIS Payments' : payload.paymentMethod === 'bank' ? 'Τραπεζική Κατάθεση' : (payload.paymentMethod || '-');

  const textLines = [
    `ΝΕΑ ΠΑΡΑΓΓΕΛΙΑ ΣΤΟ ARAM CREATIONS`,
    `====================================================`,
    `Κωδικός Παραγγελίας: ${payload.number}`,
    `Σύνολο: €${Number(payload.total || 0).toFixed(2)}` + (payload.shippingCost !== undefined ? ` (Μεταφορικά: €${Number(payload.shippingCost).toFixed(2)})` : ''),
    `Τρόπος Πληρωμής: ${paymentLabel}`,
    `Τρόπος Αποστολής: ${shippingLabel}`,
    `Κατάσταση: ${payload.status === 'paid' ? 'Πληρωμένη' : 'Αναμονή πληρωμής / Νέα'}`,
    ``,
    `ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ`,
    `----------------------------------------------------`,
    `Ονοματεπώνυμο: ${customer.name || '-'}`,
    `Τηλέφωνο: ${customer.phone || '-'}`,
    `Email: ${customer.email || '-'}`,
    `Διεύθυνση: ${customer.address || '-'}, ${customer.city || '-'} ${customer.postalCode || ''}`,
    customer.notes ? `Σημειώσεις πελάτη: ${customer.notes}` : '',
    ``,
    `ΕΙΔΗ ΠΑΡΑΓΓΕΛΙΑΣ`,
    `----------------------------------------------------`,
    itemsText || 'Δεν καταγράφηκαν επιμέρους είδη',
    ``,
    `====================================================`,
    `Διαχειριστείτε την παραγγελία στο Back Office:`,
    adminUrl,
    `====================================================`
  ].filter(Boolean);

  const response = await send('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `order-notification/${id}`
    },
    body: JSON.stringify({
      from: 'Aram Creations <onboarding@resend.dev>',
      to: [OWNER_EMAIL],
      subject: `Νέα παραγγελία ${payload.number} (€${Number(payload.total).toFixed(2)})`,
      text: textLines.join('\n')
    })
  });

  if (!response.ok) throw new Error(`MAIL_HTTP_${response.status}`);
  const result = await response.json();
  if (!result.id) throw new Error('MAIL_RESPONSE_INVALID');
  return String(result.id);
}

export async function notifyOrder(db: Firestore, id: string, send = sendOrderEmail) {
  const ref = db.doc(`orderNotifications/${id}`);
  const payload = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    const now = Date.now();
    if (!data || (data.state !== 'pending' && data.state !== 'awaiting_payment') || (data.leaseUntil && data.leaseUntil > now)) return null;
    if (data.firstAttemptAt && now - data.firstAttemptAt > 23 * 3600000) {
      tx.update(ref, { state: 'review_required', error: 'Η ειδοποίηση χρειάζεται χειροκίνητο έλεγχο στη Resend.' });
      return null;
    }

    // If payload doesn't have customer details, pull from order document
    let orderPayload = data.payload || {};
    const orderSnap = await tx.get(db.doc(`orders/${id}`));
    if (orderSnap.exists) {
      const orderData = orderSnap.data()!;
      if (orderData.status === 'cancelled') {
        tx.update(ref, { state: 'cancelled', leaseUntil: 0, error: '' });
        return null;
      }
      if (!orderPayload.customer) {
        orderPayload = {
          number: orderData.number,
          total: orderData.total,
          subtotal: orderData.subtotal,
          shippingCost: orderData.shippingCost,
          shippingMethod: orderData.shippingMethod,
          paymentMethod: orderData.paymentMethod,
          customer: orderData.customer,
          items: orderData.items,
          status: orderData.status
        };
      } else if (orderData.status) {
        orderPayload = { ...orderPayload, status: orderData.status };
      }
    }

    tx.update(ref, {
      state: 'pending',
      leaseUntil: now + 60000,
      firstAttemptAt: data.firstAttemptAt || now,
      attempts: (data.attempts || 0) + 1,
      payload: orderPayload
    });
    return orderPayload;
  });

  if (!payload) return;
  try {
    const emailId = await send(id, payload);
    await ref.update({ state: 'sent', emailId, sentAt: new Date().toISOString(), leaseUntil: 0, error: '' });
    await db.doc(`orders/${id}`).update({ emailNotification: 'sent' });
  } catch (error: any) {
    // Preserve the pending outbox if a request times out. Retry with the same idempotency key.
    await ref.update({ leaseUntil: 0, error: /^MAIL_/.test(error.message || '') ? error.message : 'MAIL_RETRY_PENDING' });
    await db.doc(`orders/${id}`).update({ emailNotification: 'pending' });
  }
}

export async function retryNotifications(db: Firestore) {
  const pending = await db.collection('orderNotifications').where('state', '==', 'pending').limit(2).get();
  for (const row of pending.docs) await notifyOrder(db, row.id);
}
