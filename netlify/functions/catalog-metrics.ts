import { createHash } from 'node:crypto';
import { adminDatabase } from '../../server/admin-database';
import { requirePrivacyRuntime } from '../../server/catalog-publication';
import { projectProduct, visible } from '../../server/public-projection';
export default async function handler(request: Request, context: { ip?: string } = {}) {
  try {
    requirePrivacyRuntime();
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const text = await request.text(); if (text.length > 1000) throw Error('Invalid metric');
    const input = JSON.parse(text);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !/^[a-f0-9-]{36}$/.test(input.requestId) || !['view', 'favorite'].includes(input.kind) || (input.kind === 'view' ? input.delta !== 1 : ![1, -1].includes(input.delta))) throw Error('Invalid metric');
    const { db } = adminDatabase(), event = db.doc(`catalogMetricEvents/${input.requestId}`);
    const ip = createHash('sha256').update(context.ip || 'unknown').digest('hex'), rate = db.doc(`catalogMetricLimits/${ip}`), now = Date.now();
    await db.runTransaction(async tx => {
      const [previous, canonical, published, limit] = await tx.getAll(event, db.doc(`jewelry/${input.id}`), db.doc(`publicCatalog/${input.id}`), rate);
      if (previous.exists) return;
      if (!canonical.exists || !published.exists || !visible(canonical.data())) throw Error('Not public');
      const fresh = now - Number(limit.data()?.startedAt || 0) > 3600000;
      if (!fresh && Number(limit.data()?.count || 0) >= 120) throw Error('Rate limit');
      const fields = input.kind === 'view' ? ['views', 'viewCount'] : ['likes', 'favorites', 'shopFavorites'];
      const patch = Object.fromEntries(fields.map(key => [key, Math.max(0, Number(canonical.data()![key] || 0) + input.delta)]));
      const data = { ...canonical.data(), ...patch };
      tx.update(canonical.ref, patch);
      tx.set(published.ref, projectProduct(data, published.data()!.mediaList)!);
      tx.create(event, { at: now, id: input.id, kind: input.kind });
      tx.set(rate, { startedAt: fresh ? now : limit.data()!.startedAt, count: fresh ? 1 : Number(limit.data()?.count || 0) + 1 });
    });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Μη έγκυρη ή μη διαθέσιμη ενημέρωση μετρητή.' }, { status: 409 }); }
}
