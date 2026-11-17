import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type { VintedReviewsController } from './useVintedReviews';

/** Persisted catalog fields remain extensible for legacy and imported products. */
export type CatalogRecord = Record<string, any>;

export type { ShopSettings } from '../../shopSettings';

/** State owned by the Back Office session, shared with feature controllers. */
export interface BackOfficeSharedState {
    activeCollection: 'jewelry' | 'portfolio' | 'orders';
    firebaseReady: boolean;
    currentUser: User | null;
    jewelryList: Record<string, any>[];
    isSaving: boolean;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
    vintedReviews: VintedReviewsController;
    vintedReviewsData: VintedReviewsController['vintedReviewsData'];
}
