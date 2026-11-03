import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  BadgeCheck,
  Quote,
  ExternalLink,
  MessageSquareQuote,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  CornerDownRight
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { VintedReview, VintedReviewsStats, VintedReviewsPayload } from '../types/vinted-reviews';

interface VintedReviewsSectionProps {
  className?: string;
  theme?: 'atelier' | 'classic';
  fontFamily?: string;
}

// Fallback dataset guarantees zero layout shift while Firestore/API connects
const INITIAL_STATS: VintedReviewsStats = {
  memberId: '231329281',
  login: 'aramcreations',
  feedbackCount: 10,
  positiveFeedbackCount: 10,
  neutralFeedbackCount: 0,
  negativeFeedbackCount: 0,
  feedbackReputation: 1,
  ratingScore: 5.0,
  itemCount: 106,
  lastUpdated: '2026-10-27T16:18:36+01:00'
};

const INITIAL_REVIEWS: VintedReview[] = [
  {
    id: 4632468837,
    date: '2026-10-27T16:18:36+01:00',
    formattedDate: '27 Οκτωβρίου 2026',
    rating: 5,
    feedback: 'Τα προϊόντα έφτασαν σε τέλεια κατάσταση, η συσκευασία τους πολύ προσεγμένη και με οδηγίες χρήσης για το πώς να τα προσέξω ❤️',
    systemFeedback: false,
    userLogin: 'vasileiasefer',
    sellerReply: '❤️❤️❤️',
    feedbackUserId: 3196233919
  },
  {
    id: 4455775848,
    date: '2026-09-26T10:01:30+02:00',
    formattedDate: '26 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Το κολιέ είναι πραγματικά πανέμορφο! 🌸 Το λουλούδι  το κάνει πολύ ξεχωριστό και φαίνεται ακόμη πιο όμορφο από κοντά. Πολύ προσεγμένη δουλειά και λεπτομέρεια. ❤️',
    systemFeedback: false,
    userLogin: 'piscesismysign',
    sellerReply: 'Ευχαριστώ πολύ!!! ❤️❤️❤️',
    feedbackUserId: 228941783
  },
  {
    id: 4377762386,
    date: '2026-09-10T14:25:19+02:00',
    formattedDate: '10 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Ολα τέλεια, ευχαριστώ!',
    systemFeedback: false,
    userLogin: 'zoioulia',
    sellerReply: 'Εγώ ευχαριστώ πολύ!! 🤗',
    feedbackUserId: 219842104
  },
  {
    id: 4364751101,
    date: '2026-09-07T19:37:32+02:00',
    formattedDate: '7 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Τέλειο το κολιέ και πολύ καλή συσκευασία',
    systemFeedback: false,
    userLogin: 'alkistisgln',
    sellerReply: 'Ευχαριστώ παρα πολύ!! 🤍🤍',
    feedbackUserId: 216743912
  },
  {
    id: 4346608968,
    date: '2026-09-03T17:28:19+02:00',
    formattedDate: '3 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Άμεση αποστολή, τέλειο κολιέ και μου έβαλε και δωράκι ένα μπρελόκ! θα ξαναπάρω σίγουρα ⭐',
    systemFeedback: false,
    userLogin: 'dosdosss',
    sellerReply: 'Ευχαριστώ πάρα πολύ!! ✨️🤍',
    feedbackUserId: 211094381
  },
  {
    id: 4257860663,
    date: '2026-08-12T14:40:58+02:00',
    formattedDate: '12 Αυγούστου 2026',
    rating: 5,
    feedback: 'Πανέμορφα σκουλαρίκια σε σχέδιο ορχιδέας! 🌸✨ Είναι ακόμα πιο εντυπωσιακά από κοντά, πολύ κομψά και ξεχωριστά. Τα λάτρεψα! 😍',
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
    feedback: 'Beautiful necklace, highly recommend.',
    systemFeedback: false,
    userLogin: 'mihaelaf86',
    sellerReply: 'Thank you so much!! 🤗',
    feedbackUserId: 198734120
  },
  {
    id: 3985066423,
    date: '2026-05-27T16:15:40+02:00',
    formattedDate: '27 Μαΐου 2026',
    rating: 5,
    feedback: 'Πολύ όμορφο κολιέ και packaging🌺',
    systemFeedback: false,
    userLogin: 'katclos',
    sellerReply: 'Σας ευχαριστώ πολύ!! 😊',
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

export const VintedReviewsSection: React.FC<VintedReviewsSectionProps> = ({
  className = '',
  theme = 'atelier',
  fontFamily = 'Jura, sans-serif'
}) => {
  const [stats, setStats] = useState<VintedReviewsStats>(INITIAL_STATS);
  const [reviews, setReviews] = useState<VintedReview[]>(INITIAL_REVIEWS);
  const [filterMode, setFilterMode] = useState<'all' | 'written' | 'verified'>('written');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // 1. Subscribe to Firestore for live real-time synchronization
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'vinted_reviews'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.stats) setStats(data.stats);
          if (Array.isArray(data?.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
          }
          if (data?.updatedAt) {
            setLastSyncTime(data.updatedAt);
          }
        }
      },
      (error) => {
        console.warn('Firestore vinted_reviews subscription fallback:', error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Initial fetch from API if needed
  useEffect(() => {
    let isMounted = true;
    async function loadApi() {
      try {
        setLoading(true);
        const res = await fetch('/api/vinted-reviews');
        if (res.ok) {
          const payload: VintedReviewsPayload = await res.json();
          if (isMounted && payload.ok) {
            if (payload.stats) setStats(payload.stats);
            if (Array.isArray(payload.reviews) && payload.reviews.length > 0) {
              setReviews(payload.reviews);
            }
          }
        }
      } catch (err: any) {
        console.warn('Vinted reviews fetch warning:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadApi();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter reviews based on user selection
  const filteredReviews = useMemo(() => {
    if (filterMode === 'written') {
      return reviews.filter((r) => !r.systemFeedback);
    }
    if (filterMode === 'verified') {
      return reviews.filter((r) => r.systemFeedback);
    }
    return reviews;
  }, [reviews, filterMode]);

  const writtenCount = useMemo(() => reviews.filter((r) => !r.systemFeedback).length, [reviews]);
  const verifiedCount = useMemo(() => reviews.filter((r) => r.systemFeedback).length, [reviews]);

  const displayedReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  return (
    <section
      id="vinted-reviews"
      aria-label="Αξιολογήσεις Vinted"
      className={`py-16 sm:py-24 border-t border-stone-200/90 transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-bold uppercase tracking-widest shadow-xs">
            <BadgeCheck className="w-4 h-4 text-teal-700 shrink-0" strokeWidth={1.5} />
            <span>Επαληθευμένες Αξιολογήσεις Vinted</span>
          </div>

          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-stone-900"
            style={{ fontFamily }}
          >
            Εμπειρίες & Εντυπώσεις Πελατών
          </h2>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-sans">
            100% θετικές κριτικές από πραγματικούς αγοραστές στο επίσημο κατάστημα{' '}
            <span className="font-semibold text-stone-900">Aram Creations</span> στο Vinted.
          </p>
        </div>

        {/* Social Proof Hero Highlight Card */}
        <div className="mb-12 rounded-2xl bg-white text-stone-900 p-6 sm:p-8 shadow-xs border border-stone-200/90 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Rating Big Number */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-6 text-center sm:text-left border-b lg:border-b-0 lg:border-r border-stone-200 pb-6 lg:pb-0 lg:pr-8">
              <div className="text-6xl sm:text-7xl font-bold tracking-tight text-stone-900 font-mono">
                5.0
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-amber-400 text-amber-400"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <div className="text-xs uppercase tracking-wider font-bold text-stone-700">
                  100% Θετική Φήμη
                </div>
                <div className="text-[11px] text-stone-500">
                  Βασισμένο σε {stats.feedbackCount} πιστοποιημένες αγορές
                </div>
              </div>
            </div>

            {/* Trust Pillars */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-stone-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
                  <span>Προστασία Vinted</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-normal">
                  Αυθεντικές αγορές με ασφάλεια συναλλαγής και επίσημη παρακολούθηση.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-stone-800 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.5} />
                  <span>Άψογη Συσκευασία</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-normal">
                  Χειροποίητη συσκευασία δώρου με οδηγίες φροντίδας και ασφαλή αποστολή.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 flex flex-col justify-between text-center sm:text-left">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Επίσημη Παρουσία
                  </div>
                  <div className="text-xs font-bold text-stone-900">
                    @{stats.login || 'aramcreations'}
                  </div>
                </div>

                <a
                  href={`https://www.vinted.gr/member/${stats.memberId || '231329281'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-xs"
                >
                  <span>Προφίλ Vinted</span>
                  <ExternalLink className="w-3 h-3 text-white" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setFilterMode('written');
                setVisibleCount(6);
              }}
              className={`px-4 py-2 rounded-xl transition ${
                filterMode === 'written'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Γραπτές Κριτικές ({writtenCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setVisibleCount(6);
              }}
              className={`px-4 py-2 rounded-xl transition ${
                filterMode === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Όλες οι Αξιολογήσεις ({reviews.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('verified');
                setVisibleCount(6);
              }}
              className={`px-4 py-2 rounded-xl transition ${
                filterMode === 'verified'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Επιβεβαιώσεις Παράδοσης ({verifiedCount})
            </button>
          </div>

          <a
            href={`https://www.vinted.gr/member/${stats.memberId || '231329281'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 transition group"
          >
            <span>Όλες οι κριτικές στο Vinted</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
          </a>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedReviews.map((review) => {
            const initialLetter = (review.userLogin?.[0] || 'A').toUpperCase();

            return (
              <div
                key={review.id}
                className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top user bar */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Monogram luxury avatar */}
                      <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-sm font-mono shrink-0">
                        {initialLetter}
                      </div>

                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-stone-900">
                            {review.userLogin}
                          </span>
                          <span title="Επαληθευμένος Αγοραστής Vinted">
                            <BadgeCheck
                              className="w-3.5 h-3.5 text-teal-600 shrink-0"
                              strokeWidth={1.5}
                            />
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-sans">
                          {review.formattedDate}
                        </span>
                      </div>
                    </div>

                    <Quote className="w-5 h-5 text-stone-200 group-hover:text-stone-300 transition-colors shrink-0" strokeWidth={1.5} />
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans font-normal italic">
                    "{sanitizeVintedDescription(review.feedback)}"
                  </p>
                </div>

                {/* Seller Reply if present */}
                {review.sellerReply && (
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-start gap-2 text-xs text-stone-600 bg-stone-50/70 p-3 rounded-xl">
                    <CornerDownRight className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                        Aram Creations
                      </div>
                      <p className="text-[11px] text-stone-700 font-sans italic">
                        {sanitizeVintedDescription(review.sellerReply)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-6 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition shadow-xs"
            >
              Προβολή περισσότερων αξιολογήσεων ({filteredReviews.length - visibleCount} απομένουν)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
