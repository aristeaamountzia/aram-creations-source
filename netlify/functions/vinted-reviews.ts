import { getVintedReviews, fetchLiveVintedReviews, persistVintedReviewsToFirestore } from '../../server/vinted-reviews';
import { requireAdmin } from '../../server/admin-database';

export default async function handler(request: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (!['GET', 'POST'].includes(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers });

  try {
    const url = new URL(request.url);
    const isSync = request.method === 'POST';
    const memberId = url.searchParams.get('member_id') || undefined;
    const forceRefresh = ['1', 'true'].includes(url.searchParams.get('refresh') || '');
    if (request.method === 'POST' || forceRefresh) {
      if (!request.headers.get('authorization')?.match(/^Bearer\s+\S+$/i)) {
        return Response.json({ ok: false, error: 'Απαιτείται σύνδεση διαχειριστή.' }, { status: 401, headers });
      }
      await requireAdmin(request);
    }

    if (isSync) {
      const live = await fetchLiveVintedReviews(memberId);
      await persistVintedReviewsToFirestore(live.stats, live.reviews);
      return Response.json({
        ok: true,
        stats: live.stats,
        reviews: live.reviews,
        source: 'live',
        cachedAt: new Date().toISOString()
      }, { headers });
    }

    const payload = await getVintedReviews({ forceRefresh, memberId });
    return Response.json(payload, { headers });
  } catch (error: any) {
    if (error.message === 'ADMIN_REQUIRED') return Response.json({ ok: false, error: 'Δεν επιτρέπεται η πρόσβαση.' }, { status: 403, headers });
    return Response.json({
      ok: false,
      error: error.message || 'Αποτυχία φόρτωσης αξιολογήσεων Vinted',
      code: 'VINTED_REVIEWS_ERROR'
    }, { status: 502, headers });
  }
}
