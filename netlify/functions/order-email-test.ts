import { requireAdmin } from '../../server/admin-database';
import { sendOrderEmail } from '../../server/order-notifications';
export default async function handler(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    // One test per hour. No order or inventory changes.
    const slot = new Date().toISOString().slice(0, 13);
    const ref = db.doc(`notificationTests/${slot}`);
    if ((await ref.get()).exists) return Response.json({ ok: true, message: 'Η δοκιμή αυτής της ώρας έχει ήδη σταλεί.' });
    const id = await sendOrderEmail(`test-${slot}`, { number: 'ΔΟΚΙΜΗ — δεν είναι παραγγελία', total: 0 });
    await ref.set({ at: new Date().toISOString(), emailId: id });
    return Response.json({ ok: true });
  } catch (error: any) { return Response.json({ error: error.message === 'ADMIN_REQUIRED' ? 'Απαιτείται διαχειριστής.' : 'Η δοκιμαστική ειδοποίηση δεν στάλθηκε. Έλεγξε RESEND_API_KEY και δικαιώματα Sending access.' }, { status: error.message === 'ADMIN_REQUIRED' ? 403 : 503 }); }
}
