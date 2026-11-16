import { createHash } from 'node:crypto';
import { adminDatabase } from '../../server/admin-database';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const count = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
export function createShopMetricsHandler(connect = adminDatabase) {
  return async (request: Request, context: { ip?: string } = {}) => {
    const reply = (data: any, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
    try {
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Μη επιτρεπόμενη προέλευση.' }, 403);
      if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Απαιτούνται δεδομένα JSON.' }, 400);
      const text = await request.text();
      if (text.length > 1000) return reply({ error: 'Το αίτημα είναι πολύ μεγάλο.' }, 413);
      const { itemId, visitorId, action, liked } = JSON.parse(text);
      if (typeof itemId !== 'string' || !/^[\w-]{1,150}$/.test(itemId) || typeof visitorId !== 'string' || !/^[a-f0-9-]{36}$/.test(visitorId) ||
          !['view', 'favorite'].includes(action) || (action === 'favorite' && typeof liked !== 'boolean')) return reply({ error: 'Μη έγκυρη ενέργεια.' }, 400);
      const { db } = connect();
      const now = Date.now();
      const result = await db.runTransaction(async tx => {
        const productRef = db.doc(`jewelry/${itemId}`);
        const visitorRef = db.doc(`shopMetricVisitors/${hash(`${itemId}:${visitorId}`)}`);
        const limitRef = db.doc(`shopMetricLimits/${hash(context.ip || 'unknown')}`);
        const [product, visitor, limit] = await Promise.all([tx.get(productRef), tx.get(visitorRef), tx.get(limitRef)]);
        if (!product.exists || product.data()!.deletedAt || product.data()!.isDeleted) return null;
        const data = product.data()!, seen = visitor.data() || {}, rate = limit.data() || {};
        const fresh = !rate.startedAt || now - rate.startedAt > 3_600_000;
        if (!fresh && rate.count >= 240) throw new Error('RATE_LIMIT');
        const patch: Record<string, any> = {}, state: Record<string, any> = {};
        if (action === 'view' && (!seen.viewedAt || now - seen.viewedAt > 86_400_000)) {
          const views = Math.max(count(data.views), count(data.viewCount), count(data.vintedViews)) + 1;
          Object.assign(patch, { views, viewCount: views }); state.viewedAt = now;
        }
        if (action === 'favorite' && Boolean(seen.liked) !== liked) {
          const likes = Math.max(0, count(data.shopFavorites ?? data.likes ?? data.favorites ?? data.vintedFavorites) + (liked ? 1 : -1));
          Object.assign(patch, { likes, favorites: likes, shopFavorites: likes }); state.liked = liked;
        }
        tx.set(limitRef, { count: fresh ? 1 : rate.count + 1, startedAt: fresh ? now : rate.startedAt });
        if (Object.keys(patch).length) { tx.update(productRef, patch); tx.set(visitorRef, { ...seen, ...state }); }
        return { likes: patch.shopFavorites ?? count(data.shopFavorites ?? data.likes ?? data.favorites), views: patch.views ?? count(data.views ?? data.viewCount) };
      });
      return result ? reply({ ok: true, ...result }) : reply({ error: 'Το προϊόν δεν υπάρχει.' }, 404);
    } catch (error) {
      if (error instanceof SyntaxError) return reply({ error: 'Μη έγκυρα δεδομένα JSON.' }, 400);
      if (error instanceof Error && error.message === 'RATE_LIMIT') return reply({ error: 'Έγιναν πολλές ενέργειες. Δοκίμασε αργότερα.' }, 429);
      console.error('Shop metrics unavailable', error instanceof Error ? error.message : 'unknown');
      return reply({ error: 'Η ενημέρωση του μετρητή δεν είναι διαθέσιμη.' }, 503);
    }
  };
}
export default createShopMetricsHandler();
