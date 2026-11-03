import type { Handler } from '@netlify/functions';
import { getVintedReviews, fetchLiveVintedReviews, persistVintedReviewsToFirestore } from '../../server/vinted-reviews';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const isSync = event.httpMethod === 'POST' && (event.path.endsWith('/sync') || event.queryStringParameters?.sync === '1');
    const memberId = event.queryStringParameters?.member_id || undefined;

    if (isSync) {
      const live = await fetchLiveVintedReviews(memberId);
      await persistVintedReviewsToFirestore(live.stats, live.reviews);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          stats: live.stats,
          reviews: live.reviews,
          source: 'live',
          cachedAt: new Date().toISOString()
        })
      };
    }

    const forceRefresh = event.queryStringParameters?.refresh === '1';
    const payload = await getVintedReviews({ forceRefresh, memberId });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(payload)
    };
  } catch (error: any) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message || 'Αποτυχία φόρτωσης αξιολογήσεων Vinted',
        code: 'VINTED_REVIEWS_ERROR'
      })
    };
  }
};

