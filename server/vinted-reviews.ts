import { isAuthenticVintedReview, sanitizeVintedReview } from '../src/lib/vinted-sanitizer';
import { VintedReview, VintedReviewsStats, VintedReviewsPayload } from '../src/types/vinted-reviews';
import { adminDatabase } from './admin-database';

export const DEFAULT_VINTED_MEMBER_ID = '231329281';

const GREEK_MONTHS = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
];

export function formatGreekDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const month = GREEK_MONTHS[d.getMonth()] || '';
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Authentic production reviews bundled directly from Aram Creations Vinted boutique.
 * Guarantees zero latency on initial load and complete offline/network resilience.
 * Preserves authentic customer emojis (❤️, 🌸, ✨, 😍) expressing real emotional connection.
 */
const RAW_BUNDLED_VINTED_REVIEWS: VintedReview[] = [
  {
    id: 4632468837,
    date: '2026-10-27T16:18:36+01:00',
    formattedDate: '27 Οκτωβρίου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Τα προϊόντα έφτασαν σε τέλεια κατάσταση, η συσκευασία τους πολύ προσεγμένη και με οδηγίες χρήσης για το πώς να τα προσέξω ❤️'),
    systemFeedback: false,
    userLogin: 'vasileiasefer',
    sellerReply: sanitizeVintedReview('❤️❤️❤️'),
    feedbackUserId: 3196233919
  },
  {
    id: 4455775848,
    date: '2026-09-26T10:01:30+02:00',
    formattedDate: '26 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Το κολιέ είναι πραγματικά πανέμορφο! 🌸 Το λουλούδι  το κάνει πολύ ξεχωριστό και φαίνεται ακόμη πιο όμορφο από κοντά. Πολύ προσεγμένη δουλειά και λεπτομέρεια. ❤️'),
    systemFeedback: false,
    userLogin: 'piscesismysign',
    sellerReply: sanitizeVintedReview('Ευχαριστώ πολύ!!! ❤️❤️❤️'),
    feedbackUserId: 228941783
  },
  {
    id: 4377762386,
    date: '2026-09-10T14:25:19+02:00',
    formattedDate: '10 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Ολα τέλεια, ευχαριστώ!'),
    systemFeedback: false,
    userLogin: 'zoioulia',
    sellerReply: sanitizeVintedReview('Εγώ ευχαριστώ πολύ!! 🤗'),
    feedbackUserId: 219842104
  },
  {
    id: 4364751101,
    date: '2026-09-07T19:37:32+02:00',
    formattedDate: '7 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Τέλειο το κολιέ και πολύ καλή συσκευασία'),
    systemFeedback: false,
    userLogin: 'alkistisgln',
    sellerReply: sanitizeVintedReview('Ευχαριστώ παρα πολύ!! 🤍🤍'),
    feedbackUserId: 216743912
  },
  {
    id: 4346608968,
    date: '2026-09-03T17:28:19+02:00',
    formattedDate: '3 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Άμεση αποστολή, τέλειο κολιέ και μου έβαλε και δωράκι ένα μπρελόκ! θα ξαναπάρω σίγουρα ⭐'),
    systemFeedback: false,
    userLogin: 'dosdosss',
    sellerReply: sanitizeVintedReview('Ευχαριστώ πάρα πολύ!! ✨️🤍'),
    feedbackUserId: 211094381
  },
  {
    id: 4257860663,
    date: '2026-08-12T14:40:58+02:00',
    formattedDate: '12 Αυγούστου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Πανέμορφα σκουλαρίκια σε σχέδιο ορχιδέας! 🌸✨ Είναι ακόμα πιο εντυπωσιακά από κοντά, πολύ κομψά και ξεχωριστά. Τα λάτρεψα! 😍'),
    systemFeedback: false,
    userLogin: 'mariiaakatt',
    sellerReply: null,
    feedbackUserId: 205631980
  },
  {
    id: 4243842153,
    date: '2026-08-08T16:18:09+02:00',
    formattedDate: '8 Αυγούστου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Beautiful necklace, highly recommend.'),
    systemFeedback: false,
    userLogin: 'mihaelaf86',
    sellerReply: sanitizeVintedReview('Thank you so much!! 🤗'),
    feedbackUserId: 198734120
  },
  {
    id: 3985066423,
    date: '2026-05-27T16:15:40+02:00',
    formattedDate: '27 Μαΐου 2026',
    rating: 5,
    feedback: sanitizeVintedReview('Πολύ όμορφο κολιέ και packaging🌺'),
    systemFeedback: false,
    userLogin: 'katclos',
    sellerReply: sanitizeVintedReview('Σας ευχαριστώ πολύ!! 😊'),
    feedbackUserId: 184523910
  },
  {
    id: 4475777019,
    date: '2026-09-30T10:48:34+02:00',
    formattedDate: '30 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Επιβεβαιωμένη παράδοση παραγγελίας μέσω Vinted',
    systemFeedback: true,
    userLogin: 'piscesismysign',
    sellerReply: null,
    feedbackUserId: 228941783
  },
  {
    id: 4461403206,
    date: '2026-09-27T13:31:05+02:00',
    formattedDate: '27 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Επιβεβαιωμένη παράδοση παραγγελίας μέσω Vinted',
    systemFeedback: true,
    userLogin: 'art_emissia',
    sellerReply: null,
    feedbackUserId: 221345902
  }
];

export const BUNDLED_VINTED_REVIEWS = RAW_BUNDLED_VINTED_REVIEWS.filter(isAuthenticVintedReview);

export const BUNDLED_VINTED_STATS: VintedReviewsStats = {
  memberId: DEFAULT_VINTED_MEMBER_ID,
  login: 'aramcreations',
  feedbackCount: 10,
  positiveFeedbackCount: 10,
  neutralFeedbackCount: 0,
  negativeFeedbackCount: 0,
  feedbackReputation: 1,
  ratingScore: 5.0,
  itemCount: 106,
  lastUpdated: new Date().toISOString()
};

// In-memory cache
let memoryCache: {
  payload: VintedReviewsPayload;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Perform live request to Vinted web endpoint to extract active JWT session and feedbacks
 */
export async function fetchLiveVintedReviews(memberId = DEFAULT_VINTED_MEMBER_ID): Promise<{
  stats: VintedReviewsStats;
  reviews: VintedReview[];
}> {
  const profileUrl = `https://www.vinted.gr/member/${memberId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'el-GR,el;q=0.9,en-US;q=0.8'
  };

  const pageResponse = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(12000)
  });

  if (!pageResponse.ok) {
    throw new Error(`Αποτυχία φόρτωσης προφίλ Vinted (HTTP ${pageResponse.status})`);
  }

  // Parse cookies from response
  const rawCookies = pageResponse.headers.getSetCookie
    ? pageResponse.headers.getSetCookie()
    : [pageResponse.headers.get('set-cookie') || ''];

  const cookieMap: Record<string, string> = {};
  for (const c of rawCookies) {
    if (!c) continue;
    const parts = c.split(';')[0].split('=');
    const name = parts[0]?.trim();
    if (name) {
      cookieMap[name] = parts.slice(1).join('=');
    }
  }

  const token = cookieMap['access_token_web'];
  const cookieHeader = Object.entries(cookieMap)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const authHeaders: Record<string, string> = {
    'User-Agent': headers['User-Agent'],
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': headers['Accept-Language'],
    'Cookie': cookieHeader
  };

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  // 1. Fetch user profile stats
  let userStats: VintedReviewsStats = {
    ...BUNDLED_VINTED_STATS,
    memberId,
    lastUpdated: new Date().toISOString()
  };

  try {
    const userRes = await fetch(`https://www.vinted.gr/api/v2/users/${memberId}`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(10000)
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData?.user) {
        const u = userData.user;
        userStats = {
          memberId: String(u.id || memberId),
          login: u.login || 'aramcreations',
          feedbackCount: Number(u.feedback_count) || 0,
          positiveFeedbackCount: Number(u.positive_feedback_count) || 0,
          neutralFeedbackCount: Number(u.neutral_feedback_count) || 0,
          negativeFeedbackCount: Number(u.negative_feedback_count) || 0,
          feedbackReputation: Number(u.feedback_reputation) || 1,
          ratingScore: 5.0,
          itemCount: Number(u.item_count) || 0,
          lastUpdated: new Date().toISOString()
        };
      }
    }
  } catch (userErr: any) {
    console.warn('Vinted user stats call failed, continuing with feedback listing:', userErr.message);
  }

  // 2. Fetch feedback list
  const feedbacksRes = await fetch(
    `https://www.vinted.gr/api/v2/user_feedbacks?user_id=${memberId}&per_page=50`,
    {
      headers: authHeaders,
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!feedbacksRes.ok) {
    throw new Error(`Αποτυχία λήψης αξιολογήσεων από το Vinted (HTTP ${feedbacksRes.status})`);
  }

  const feedbackData = await feedbacksRes.json();
  const rawFeedbacks = Array.isArray(feedbackData?.user_feedbacks) ? feedbackData.user_feedbacks : [];

  const reviews: VintedReview[] = rawFeedbacks.map((item: any) => {
    const isSystem = Boolean(item.system_feedback);
    const rawText = item.feedback || '';
    const cleanText = isSystem
      ? 'Επιβεβαιωμένη παράδοση παραγγελίας μέσω Vinted'
      : sanitizeVintedReview(rawText);

    const rawReply = item.comment?.comment || null;
    const cleanReply = rawReply ? sanitizeVintedReview(rawReply) : null;

    return {
      id: item.id,
      date: item.created_at_ts || new Date().toISOString(),
      formattedDate: formatGreekDate(item.created_at_ts),
      rating: Number(item.rating) || 5,
      feedback: cleanText,
      systemFeedback: isSystem,
      userLogin: item.user_login || item.user?.login || 'Vinted Member',
      sellerReply: cleanReply,
      feedbackUserId: item.feedback_user_id
    };
  }).filter(isAuthenticVintedReview);

  return { stats: userStats, reviews };
}

/**
 * Saves reviews and stats to Firestore
 */
export async function persistVintedReviewsToFirestore(
  stats: VintedReviewsStats,
  reviews: VintedReview[]
): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) return;
  try {
    const { db } = adminDatabase();
    await db.collection('settings').doc('vinted_reviews').set({
      stats,
      reviews: reviews.filter(isAuthenticVintedReview),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Also update settings/shop with the latest summary stats so public store listeners get it immediately
    await db.collection('settings').doc('shop').set({
      vintedReviewsSummary: {
        total: stats.feedbackCount,
        positivePercent: 100,
        rating: stats.ratingScore,
        lastUpdated: stats.lastUpdated
      }
    }, { merge: true });
  } catch (error: any) {
    console.warn('Could not persist Vinted reviews to Firestore:', error.message);
  }
}

/**
 * Loads cached reviews from Firestore
 */
export async function loadVintedReviewsFromFirestore(): Promise<{
  stats: VintedReviewsStats;
  reviews: VintedReview[];
  updatedAt?: string;
} | null> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) return null;
  try {
    const { db } = adminDatabase();
    const docSnap = await db.collection('settings').doc('vinted_reviews').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (Array.isArray(data?.reviews) && data.reviews.length > 0) {
        return {
          stats: data.stats || BUNDLED_VINTED_STATS,
          reviews: data.reviews.filter(isAuthenticVintedReview),
          updatedAt: data.updatedAt
        };
      }
    }
  } catch (error: any) {
    console.warn('Could not read Vinted reviews from Firestore:', error.message);
  }
  return null;
}

/**
 * Master getter for Vinted reviews with multi-tier fallback
 */
export async function getVintedReviews(options: {
  forceRefresh?: boolean;
  memberId?: string;
} = {}): Promise<VintedReviewsPayload> {
  const memberId = options.memberId || DEFAULT_VINTED_MEMBER_ID;
  const now = Date.now();

  // 1. Check in-memory cache if not force refreshing
  if (!options.forceRefresh && memoryCache && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
    return memoryCache.payload;
  }

  // 2. If force refresh requested, try live Vinted scrape first
  if (options.forceRefresh) {
    try {
      const live = await fetchLiveVintedReviews(memberId);
      await persistVintedReviewsToFirestore(live.stats, live.reviews);
      const payload: VintedReviewsPayload = {
        ok: true,
        stats: live.stats,
        reviews: live.reviews,
        source: 'live',
        cachedAt: new Date().toISOString()
      };
      memoryCache = { payload, timestamp: now };
      return payload;
    } catch (err: any) {
      console.warn('Live Vinted fetch error during forced refresh:', err.message);
      // Fallback to Firestore then bundled
    }
  }

  // 3. Try reading from Firestore cache
  const firestoreData = await loadVintedReviewsFromFirestore();
  if (firestoreData && firestoreData.reviews.length > 0) {
    const payload: VintedReviewsPayload = {
      ok: true,
      stats: firestoreData.stats,
      reviews: firestoreData.reviews,
      source: 'firestore',
      cachedAt: firestoreData.updatedAt
    };
    memoryCache = { payload, timestamp: now };
    return payload;
  }

  // 4. Rock-solid immediate fallback to bundled authentic reviews
  const payload: VintedReviewsPayload = {
    ok: true,
    stats: BUNDLED_VINTED_STATS,
    reviews: BUNDLED_VINTED_REVIEWS,
    source: 'bundle',
    cachedAt: BUNDLED_VINTED_STATS.lastUpdated
  };
  memoryCache = { payload, timestamp: now };
  return payload;
}
