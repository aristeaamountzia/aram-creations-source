import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { notifyOperationError, notifyOperationSuccess } from '../../lib/sound-notifications';
import type { VintedReview, VintedReviewsStats } from '../../types/vinted-reviews';

export interface VintedReviewsData {
    stats: Pick<VintedReviewsStats, 'memberId' | 'login' | 'feedbackCount' | 'positiveFeedbackCount' | 'ratingScore' | 'itemCount' | 'lastUpdated'>;
    reviews: VintedReview[];
}

/** Keep this subscription mounted with Back Office, independently of its settings tab. */
export function useVintedReviews() {
    const [vintedReviewsData, setVintedReviewsData] = useState<VintedReviewsData>({
        stats: {
            memberId: '231329281',
            login: 'aramcreations',
            feedbackCount: 10,
            positiveFeedbackCount: 10,
            ratingScore: 5.0,
            itemCount: 106,
            lastUpdated: ''
        },
        reviews: []
    });
    const [isSyncingVintedReviews, setIsSyncingVintedReviews] = useState(false);
    const [vintedSyncStep, setVintedSyncStep] = useState('');
    const [vintedSyncPercent, setVintedSyncPercent] = useState(0);
    const [vintedSyncError, setVintedSyncError] = useState<string | null>(null);
    const [vintedSyncSuccess, setVintedSyncSuccess] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'vinted_reviews'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setVintedReviewsData(prev => ({
                    stats: data.stats || prev.stats,
                    reviews: Array.isArray(data.reviews) ? data.reviews : prev.reviews
                }));
            }
        }, () => {});
        return () => unsubscribe();
    }, []);

    const handleSyncVintedReviews = async () => {
        setIsSyncingVintedReviews(true);
        setVintedSyncError(null);
        setVintedSyncSuccess(null);
        setVintedSyncPercent(15);
        setVintedSyncStep('1/3: Σύνδεση με Vinted (@aramcreations)...');

        try {
            setVintedSyncPercent(45);
            setVintedSyncStep('2/3: Ανάκτηση κριτικών και βαθμολογιών...');

            if (!auth.currentUser) throw new Error('Συνδέσου ξανά στο Back Office.');
            const response = await fetch('/api/vinted-reviews/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser.getIdToken()}` },
                body: JSON.stringify({ memberId: '231329281' })
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.ok) {
                throw new Error(payload?.error || `Σφάλμα απόκρισης server (${response.status})`);
            }

            setVintedSyncPercent(85);
            setVintedSyncStep('3/3: Ενημέρωση και αποθήκευση στο Firestore...');

            setVintedReviewsData({
                stats: payload.stats,
                reviews: payload.reviews
            });

            setVintedSyncPercent(100);
            setVintedSyncStep('Ολοκληρώθηκε επιτυχώς!');
            setVintedSyncSuccess(`Συγχρονίστηκαν ${payload.reviews.length} αξιολογήσεις με βαθμολογία ${payload.stats.ratingScore || 5.0}!`);
            notifyOperationSuccess('Συγχρονισμός Vinted', `Συγχρονίστηκαν ${payload.reviews.length} αξιολογήσεις με βαθμολογία ${payload.stats.ratingScore || 5.0}!`);
        } catch (err) {
            setVintedSyncError(err.message || 'Αποτυχία συγχρονισμού αξιολογήσεων Vinted');
            notifyOperationError('Σφάλμα Συγχρονισμού Vinted', err.message || 'Αποτυχία συγχρονισμού αξιολογήσεων Vinted');
        } finally {
            setIsSyncingVintedReviews(false);
        }
    };

    return { vintedReviewsData, isSyncingVintedReviews, vintedSyncStep, vintedSyncPercent, vintedSyncError, vintedSyncSuccess, handleSyncVintedReviews };
}
export type VintedReviewsController = ReturnType<typeof useVintedReviews>;
