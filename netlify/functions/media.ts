import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { mediaFilename, mediaLocation } from '../../server/media-path';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export default async function handler(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: 'Συνδέσου στο Back Office.' }, 401);
  try {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (credentials.project_id !== 'aramcreations-e1529') return json({ error: 'Η πρόσβαση στα media δεν είναι διαθέσιμη.' }, 503);
    const app = getApps().find(app => app.name === 'media') || initializeApp({ credential: cert(credentials) }, 'media');
    const user = await getAuth(app).verifyIdToken(token).catch(() => null);
    if (!user || !(user.admin === true || user.email?.toLowerCase() === 'aristeaamnta@gmail.com')) return json({ error: 'Δεν επιτρέπεται η πρόσβαση.' }, 403);
    const raw = await request.text();
    if (raw.length > 6000) return json({ error: 'Μη έγκυρο αίτημα.' }, 400);
    const body = JSON.parse(raw);
    if (!['edit', 'download'].includes(body.action) || typeof body.url !== 'string') return json({ error: 'Μη έγκυρο αίτημα.' }, 400);
    let location;
    try { location = mediaLocation(body.url); } catch (error: any) { return json({ error: error.message }, 400); }
    if (location.bucket) {
      const file = getStorage(app).bucket(location.bucket).file(location.object);
      const [metadata] = await file.getMetadata();
      const type = metadata.contentType || '';
      if (!/^(image|video)\//.test(type)) return json({ error: 'Υποστηρίζονται εικόνες, GIF και βίντεο.' }, 415);
      if (body.action === 'download') {
        const filename = mediaFilename(body.filename || location.object.split('/').at(-1) || '', type);
        const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 300000, responseDisposition: `attachment; filename="aram-media"; filename*=UTF-8''${encodeURIComponent(filename)}` });
        return json({ url, filename });
      }
      if (!/^image\/(jpeg|png|webp|avif|bmp)$/.test(type)) return json({ error: 'Ο editor δέχεται στατικές εικόνες. Τα GIF κατεβαίνουν χωρίς μετατροπή.' }, 415);
      if (Number(metadata.size) > 18 * 1024 * 1024) return json({ error: 'Η εικόνα είναι πολύ μεγάλη για επεξεργασία.' }, 413);
      const [bytes] = await file.download();
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    }
    const upstream = await fetch(location.external, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,video/*' } });
    if (!upstream.ok) return json({ error: `Ο πάροχος αρχείου επέστρεψε HTTP ${upstream.status}.` }, 502);
    const type = upstream.headers.get('content-type') || '';
    if (!/^(image|video)\//.test(type) || (body.action === 'edit' && !/^image\/(jpeg|png|webp|avif|bmp)/.test(type))) return json({ error: 'Μη υποστηριζόμενο αρχείο.' }, 415);
    const reader = upstream.body?.getReader();
    if (!reader) return json({ error: 'Δεν παραλήφθηκε αρχείο.' }, 502);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 18 * 1024 * 1024) { await reader.cancel(); return json({ error: 'Το εξωτερικό αρχείο είναι πολύ μεγάλο. Τα ανεβασμένα αρχεία Firebase κατεβαίνουν χωρίς αυτό το όριο.' }, 413); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Aram-Filename': encodeURIComponent(mediaFilename(body.filename || '', type)) } });
  } catch (error: any) {
    console.error('Media request failed', { code: error?.code || error?.name });
    return json({ error: error?.code === 404 ? 'Το αρχείο δεν υπάρχει πλέον στο Storage.' : 'Δεν ολοκληρώθηκε η πρόσβαση στο αρχείο. Δοκίμασε ξανά.' }, error?.code === 404 ? 404 : 502);
  }
}

