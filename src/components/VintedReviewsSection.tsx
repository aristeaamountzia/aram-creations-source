import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  BadgeCheck,
  Quote,
  ExternalLink,
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
    feedback: 'Τα προϊόντα έφτασαν σε τέλεια κατάσταση, η συσκευασία τους πολύ προσεγμένη και με οδηγίες χρήσης για το πώς να τα προσέξω.',
    systemFeedback: false,
    userLogin: 'vasileiasefer',
    sellerReply: 'Σας ευχαριστώ πολύ!',
    feedbackUserId: 3196233919
  },
  {
    id: 4455775848,
    date: '2026-09-26T10:01:30+02:00',
    formattedDate: '26 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Το κολιέ είναι πραγματικά πανέμορφο! Το λουλούδι το κάνει πολύ ξεχωριστό και φαίνεται ακόμη πιο όμορφο από κοντά. Πολύ προσεγμένη δουλειά και λεπτομέρεια.',
    systemFeedback: false,
    userLogin: 'piscesismysign',
    sellerReply: 'Ευχαριστώ πολύ!',
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
    sellerReply: 'Εγώ ευχαριστώ πολύ!',
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
    sellerReply: 'Ευχαριστώ πάρα πολύ!',
    feedbackUserId: 216743912
  },
  {
    id: 4346608968,
    date: '2026-09-03T17:28:19+02:00',
    formattedDate: '3 Σεπτεμβρίου 2026',
    rating: 5,
    feedback: 'Άμεση αποστολή, τέλειο κολιέ και μου έβαλε και δωράκι ένα μπρελόκ! θα ξαναπάρω σίγουρα.',
    systemFeedback: false,
    userLogin: 'dosdosss',
    sellerReply: 'Ευχαριστώ πάρα πολύ!',
    feedbackUserId: 211094381
  },
  {
    id: 4257860663,
    date: '2026-08-12T14:40:58+02:00',
    formattedDate: '12 Αυγούστου 2026',
    rating: 5,
    feedback: 'Πανέμορφα σκουλαρίκια σε σχέδιο ορχιδέας! Είναι ακόμα πιο εντυπωσιακά από κοντά, πολύ κομψά και ξεχωριστά. Τα λάτρεψα!',
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
    sellerReply: 'Thank you so much!',
    feedbackUserId: 198734120
  },
  {
    id: 3985066423,
    date: '2026-05-27T16:15:40+02:00',
    formattedDate: '27 Μαΐου 2026',
    rating: 5,
    feedback: 'Πολύ όμορφο κολιέ και packaging',
    systemFeedback: false,
    userLogin: 'katclos',
    sellerReply: 'Σας ευχαριστώ πολύ!',
    feedbackUserId: 184523910
  }
];

export const VintedReviewsSection: React.FC<VintedReviewsSectionProps> = ({
  className = '',
  fontFamily = 'Jura, sans-serif'
}) => {
  const [stats, setStats] = useState<VintedReviewsStats>(INITIAL_STATS);
  const [reviews, setReviews] = useState<VintedReview[]>(INITIAL_REVIEWS);
  const [visibleCount, setVisibleCount] = useState<number>(6);

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
        }
      },
      () => {
        // Fallback dataset and /api/vinted-reviews endpoint remain active when Firestore rules restrict direct client subscription
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Initial fetch from API if needed
  useEffect(() => {
    let isMounted = true;
    async function loadApi() {
      try {
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
      }
    }

    loadApi();
    return () => {
      isMounted = false;
    };
  }, []);

  // Only display authentic customer reviews with actual feedback text, filtering out automated system confirmations
  const authenticReviews = useMemo(() => {
    return reviews.filter(
      (r) => !r.systemFeedback && r.feedback && r.feedback.trim().length > 0
    );
  }, [reviews]);

  // 3. Dynamically keep Schema.org JSON-LD in <head> synchronized with live Vinted stats & reviews
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const scriptEl = document.getElementById('aram-schema-jsonld');
    if (!scriptEl) return;

    const liveRatingCount = Math.max(Number(stats.feedbackCount) || 0, reviews.length || 10);
    const liveRatingValue = Number(stats.ratingScore || 5.0).toFixed(1);

    const schemaPayload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['OnlineStore', 'JewelryStore'],
          '@id': 'https://aramcreationsofficial.netlify.app/#store',
          name: 'Aram Creations',
          alternateName: 'Aram Creations Χειροποίητα Κοσμήματα & Δημιουργίες',
          url: 'https://aramcreationsofficial.netlify.app/',
          logo: 'https://aramcreationsofficial.netlify.app/logo.png',
          image: 'https://aramcreationsofficial.netlify.app/logo.png',
          description:
            'Ανακαλύψτε μοναδικά χειροποίητα κοσμήματα, δημιουργίες από υγρό γυαλί (resin art), σκουλαρίκια, κολιέ, δαχτυλίδια και custom παραγγελίες από το Aram Creations.',
          priceRange: '€',
          currenciesAccepted: 'EUR',
          paymentAccepted: 'Credit Card, Debit Card, Apple Pay, Google Pay, Revolut, IRIS, Bank Transfer',
          sameAs: [`https://www.vinted.gr/member/${stats.memberId || '231329281'}`],
          areaServed: {
            '@type': 'Country',
            name: 'GR'
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: liveRatingValue,
            bestRating: '5',
            worstRating: '1',
            ratingCount: String(liveRatingCount)
          },
          review: authenticReviews.slice(0, 8).map((r) => ({
            '@type': 'Review',
            author: {
              '@type': 'Person',
              name: r.userLogin || 'Πελάτης Vinted'
            },
            datePublished: (r.date || '').slice(0, 10) || undefined,
            reviewBody: sanitizeVintedDescription(r.feedback),
            reviewRating: {
              '@type': 'Rating',
              ratingValue: String(r.rating || 5),
              bestRating: '5',
              worstRating: '1'
            }
          }))
        },
        {
          '@type': 'WebSite',
          '@id': 'https://aramcreationsofficial.netlify.app/#website',
          url: 'https://aramcreationsofficial.netlify.app/',
          name: 'Aram Creations | Χειροποίητες Δημιουργίες & Κοσμήματα',
          inLanguage: 'el-GR',
          publisher: {
            '@id': 'https://aramcreationsofficial.netlify.app/#store'
          }
        }
      ]
    };

    scriptEl.textContent = JSON.stringify(schemaPayload);
  }, [stats, reviews, authenticReviews]);

  const displayedReviews = authenticReviews.slice(0, visibleCount);
  const hasMore = visibleCount < authenticReviews.length;
  const totalReviewCount = Math.max(Number(stats.feedbackCount) || 0, reviews.length || 10);

  return (
    <section
      id="customer-reviews"
      aria-label="Εμπειρίες & Αξιολογήσεις Πελατών"
      className={`scroll-mt-20 py-14 sm:py-20 border-t border-stone-200/80 transition-colors ${className}`}
    >
      <div id="reviews" className="sr-only" aria-hidden="true" />
      <div id="vinted-reviews" className="sr-only" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sleek Luxury Header & Trust Summary */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 pb-6 border-b border-stone-200/70">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200/80 text-stone-700 text-[10px] font-bold uppercase tracking-widest shadow-2xs">
              <BadgeCheck className="w-3.5 h-3.5 text-stone-900 shrink-0" strokeWidth={1.5} />
              <span>Επαληθευμένες Αγορές</span>
            </div>

            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900"
              style={{ fontFamily }}
            >
              Εμπειρίες & Εντυπώσεις
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 font-sans max-w-xl">
              Αυθεντικά σχόλια από πραγματικούς πελάτες για την ποιότητα των δημιουργιών, τη συσκευασία και την άμεση εξυπηρέτηση.
            </p>
          </div>

          {/* Inline Rating & Boutique Link */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-stone-50 border border-stone-200/80 rounded-2xl px-5 py-3.5 shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono text-stone-900 tracking-tight">
                {Number(stats.ratingScore || 5.0).toFixed(1)}
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  100% Θετικές ({totalReviewCount} Κριτικές)
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-stone-200 hidden sm:block" />

            <a
              href={`https://www.vinted.gr/member/${stats.memberId || '231329281'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 transition group"
            >
              <span>Vinted Boutique</span>
              <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 transition-colors" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Authentic Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {displayedReviews.map((review) => {
            const initialLetter = (review.userLogin?.[0] || 'A').toUpperCase();

            return (
              <div
                key={review.id}
                className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-sm hover:border-stone-300 transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top user bar */}
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs font-mono shrink-0">
                        {initialLetter}
                      </div>

                      <div className="leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-stone-900">
                            {review.userLogin}
                          </span>
                          <span title="Επαληθευμένη Αγορά">
                            <BadgeCheck
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                              strokeWidth={1.5}
                            />
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-600 font-sans">
                          {review.formattedDate}
                        </span>
                      </div>
                    </div>

                    <Quote className="w-4 h-4 text-stone-300 group-hover:text-stone-400 transition-colors shrink-0" strokeWidth={1.5} />
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 mb-2.5">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3 h-3 fill-amber-400 text-amber-400"
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-[13px] text-stone-700 leading-relaxed font-sans font-normal italic">
                    "{sanitizeVintedDescription(review.feedback)}"
                  </p>
                </div>

                {/* Seller Reply if present */}
                {review.sellerReply && (
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-start gap-2 text-xs text-stone-600 bg-stone-50/80 p-2.5 rounded-xl">
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

        {/* Load More Button if reviews > visibleCount */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition shadow-2xs"
            >
              Προβολή περισσότερων κριτικών ({authenticReviews.length - visibleCount} απομένουν)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
