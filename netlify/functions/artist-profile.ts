import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../server/admin-database';
import { MAX_CV_BYTES, validateBiography, validateCv } from '../../server/artist-profile';

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export default async function handler(request: Request) {
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Μη επιτρεπτή μέθοδος.' }, 405);
  try {
    if (request.method === 'POST') await requireAdmin(request);
    const [{ db }, { artistProfile }] = await Promise.all([import('../../db/index.js'), import('../../db/schema.js')]);
    const [current] = await db.select().from(artistProfile).where(eq(artistProfile.id, 1));
    const store = getStore({ name: 'artist-documents', consistency: 'strong' });
    if (request.method === 'GET') {
      if (new URL(request.url).searchParams.get('cv') === '1') {
        if (!current?.cvKey) return reply({ error: 'Δεν υπάρχει διαθέσιμο βιογραφικό.' }, 404);
        const file = await store.get(current.cvKey, { type: 'arrayBuffer' });
        if (!file) return reply({ error: 'Το αρχείο δεν βρέθηκε.' }, 404);
        return new Response(file, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': "inline; filename=artist-cv.pdf; filename*=UTF-8''" + encodeURIComponent(current.cvName || 'artist-cv.pdf'), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
      }
      return reply({ biography: current?.biography || '', cvName: current?.cvName || '', hasCv: Boolean(current?.cvKey) });
    }
    if (Number(request.headers.get('content-length')) > MAX_CV_BYTES + 50000) return reply({ error: 'Το αρχείο είναι πολύ μεγάλο.' }, 413);
    const form = await request.formData();
    let biography: string, bytes: Uint8Array | undefined;
    const cv = form.get('cv');
    try {
      biography = validateBiography(form.get('biography'));
      if (cv instanceof File && cv.size) bytes = await validateCv(cv);
    } catch (error: any) { return reply({ error: error.message }, 400); }
    let cvKey = current?.cvKey || null, cvName = current?.cvName || null;
    if (form.get('removeCv') === 'true') { cvKey = null; cvName = null; }
    if (bytes && cv instanceof File) {
      cvKey = `cv/${randomUUID()}.pdf`;
      cvName = cv.name.replace(/[\x00-\x1f<>:"/\\|?*]/g, '-').slice(0, 160);
      await store.set(cvKey, bytes.buffer as ArrayBuffer);
    }
    try {
      await db.insert(artistProfile).values({ id: 1, biography, cvKey, cvName }).onConflictDoUpdate({ target: artistProfile.id, set: { biography, cvKey, cvName } });
    } catch (error) {
      if (bytes && cvKey) await store.delete(cvKey).catch(() => {});
      throw error;
    }
    if (current?.cvKey && current.cvKey !== cvKey) await store.delete(current.cvKey).catch(() => {});
    return reply({ biography, cvName: cvName || '', hasCv: Boolean(cvKey) });
  } catch (error: any) {
    if (error?.message === 'ADMIN_REQUIRED') return reply({ error: 'Απαιτείται σύνδεση διαχειριστή.' }, 403);
    return reply({ error: 'Δεν φορτώθηκε ή αποθηκεύτηκε η παρουσίαση. Δοκίμασε ξανά.' }, 503);
  }
}
