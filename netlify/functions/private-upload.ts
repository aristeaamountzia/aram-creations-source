import { randomUUID } from 'node:crypto';
import { requireAdmin } from '../../server/admin-database';
import { requirePrivacyRuntime } from '../../server/catalog-publication';
import { testModeEnabled } from '../../server/test-isolation';
// GCS writes do not create Firebase download tokens. Production bytes travel
// directly to a short-lived signed write URL; emulator bytes stay loopback.
export default async function handler(request: Request) {
  try {
    requirePrivacyRuntime();
    const services = await requireAdmin(request);
    if (request.method === 'PUT' && testModeEnabled()) {
      const id = new URL(request.url).searchParams.get('id') || '';
      if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 400 });
      const token = request.headers.get('authorization')!.slice(7), user = await services.auth.verifyIdToken(token);
      const ticket = services.db.doc(`catalogUploadTickets/${id}`);
      const data = (await ticket.get()).data();
      if (!data || data.by !== user.uid || data.expires < Date.now() || data.state !== 'pending') return new Response(null, { status: 403 });
      const bytes = Buffer.from(await request.arrayBuffer());
      if (bytes.length !== data.size) return new Response(null, { status: 400 });
      await services.db.runTransaction(async tx => { const current = (await tx.get(ticket)).data(); if (current?.state !== 'pending') throw new Error('Upload already consumed'); tx.update(ticket, { state: 'writing' }); });
      await services.bucket.file(data.path).save(bytes, { resumable: false, metadata: { contentType: data.type, metadata: {} }, preconditionOpts: { ifGenerationMatch: 0 } });
      await ticket.update({ state: 'done' });
      return new Response(null, { status: 204 });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    const text = await request.text(); if (text.length > 3000) return new Response(null, { status: 400 });
    const { path, type, size } = JSON.parse(text);
    if (typeof path !== 'string' || !/^(jewelry|privateMedia)\/[A-Za-z0-9_./-]{1,500}$/.test(path) || path.includes('..') || !/^(image|video)\/[A-Za-z0-9.+-]+$/.test(type || '') || !Number.isInteger(size) || size < 1 || size > 30 * 1024 * 1024) return new Response(null, { status: 400 });
    if ((await services.bucket.file(path).exists())[0]) return new Response(null, { status: 409 });
    let url: string;
    const headers: Record<string, string> = { 'Content-Type': type };
    if (testModeEnabled()) {
      const id = randomUUID(), user = await services.auth.verifyIdToken(request.headers.get('authorization')!.slice(7));
      await services.db.doc(`catalogUploadTickets/${id}`).create({ path, type, size, by: user.uid, state: 'pending', expires: Date.now() + 300000 });
      url = `/api/private-upload?id=${id}`;
      headers.Authorization = request.headers.get('authorization')!;
    } else {
      headers['x-goog-if-generation-match'] = '0';
      [url] = await services.bucket.file(path).getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 300000, contentType: type, extensionHeaders: { 'x-goog-if-generation-match': '0' } });
    }
    return Response.json({ url, headers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) { return Response.json({ error: 'Private upload unavailable' }, { status: error.message === 'ADMIN_REQUIRED' ? 403 : 503 }); }
}
