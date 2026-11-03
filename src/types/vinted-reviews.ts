export interface VintedReview {
  id: string | number;
  date: string;
  formattedDate: string;
  rating: number; // 1-5
  feedback: string;
  systemFeedback: boolean;
  userLogin: string;
  sellerReply?: string | null;
  feedbackUserId?: string | number;
}

export interface VintedReviewsStats {
  memberId: string;
  login: string;
  feedbackCount: number;
  positiveFeedbackCount: number;
  neutralFeedbackCount: number;
  negativeFeedbackCount: number;
  feedbackReputation: number; // 1.0 = 100%
  ratingScore: number; // 5.0
  itemCount: number;
  lastUpdated: string;
}

export interface VintedReviewsPayload {
  ok: boolean;
  stats: VintedReviewsStats;
  reviews: VintedReview[];
  source: 'live' | 'cache' | 'firestore' | 'bundle';
  cachedAt?: string;
  error?: string;
}

