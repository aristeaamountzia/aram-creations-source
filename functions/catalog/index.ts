import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { syncPublicJewelry } from '../../server/public-catalog-sync';

initializeApp();
export const publishShopCatalog = onDocumentWritten({
  document: 'jewelry/{itemId}', database: '(default)', region: 'us-central1',
  retry: true, maxInstances: 3, memory: '256MiB', timeoutSeconds: 60,
}, async event => {
  await syncPublicJewelry(getFirestore(), event.params.itemId);
});
