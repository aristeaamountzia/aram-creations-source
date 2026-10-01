import type { Firestore } from 'firebase-admin/firestore';
export const OWNER_EMAIL = 'aristeaamnta@gmail.com';
export async function sendOrderEmail(id: string, payload: { number: string; total: number }, send = fetch) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('MAIL_NOT_CONFIGURED');
  const response = await send('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-notification/${id}` },
    body: JSON.stringify({ from: 'Aram Creations <onboarding@resend.dev>', to: [OWNER_EMAIL], subject: `Νέα παραγγελία ${payload.number}`, text: `Καταχωρήθηκε νέα παραγγελία στο Aram Creations.\n\nΚωδικός: ${payload.number}\nΣύνολο: ${Number(payload.total).toFixed(2)} €\n\nΔες τα στοιχεία και επιβεβαίωσε την πληρωμή στο Back Office:\nhttps://lovely-bienenstitch-b6079c.netlify.app/#admin\n\nΑυτόματη ειδοποίηση· δεν έχει γίνει αυτόματη χρέωση.` })
  });
  if (!response.ok) throw new Error(`MAIL_HTTP_${response.status}`);
  const result = await response.json();
  if (!result.id) throw new Error('MAIL_RESPONSE_INVALID');
  return String(result.id);
}
export async function notifyOrder(db: Firestore, id: string, send = sendOrderEmail) {
  const ref = db.doc(`orderNotifications/${id}`);
  const payload = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const data = snapshot.data(); const now = Date.now();
    if (!data || data.state !== 'pending' || data.leaseUntil > now) return null;
    if (data.firstAttemptAt && now - data.firstAttemptAt > 23 * 3600000) { tx.update(ref, { state: 'review_required', error: 'Η ειδοποίηση χρειάζεται χειροκίνητο έλεγχο στη Resend.' }); return null; }
    tx.update(ref, { leaseUntil: now + 60000, firstAttemptAt: data.firstAttemptAt || now, attempts: (data.attempts || 0) + 1 });
    return data.payload as { number: string; total: number };
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
