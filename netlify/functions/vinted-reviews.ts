import { getVintedReviews, fetchLiveVintedReviews, persistVintedReviewsToFirestore } from '../../server/vinted-reviews';

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

  try {
    const url = new URL(request.url);
    const isSync = request.method === 'POST' && (url.pathname.endsWith('/sync') || url.searchParams.get('sync') === '1');
    const memberId = url.searchParams.get('member_id') || undefined;

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

    const forceRefresh = url.searchParams.get('refresh') === '1';
    const payload = await getVintedReviews({ forceRefresh, memberId });
    return Response.json(payload, { headers });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: error.message || 'Αποτυχία φόρτωσης αξιολογήσεων Vinted',
      code: 'VINTED_REVIEWS_ERROR'
    }, { status: 502, headers });
  }
}
