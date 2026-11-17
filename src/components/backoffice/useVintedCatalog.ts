import { compressImageBlob } from './image-processing';
import { addJewelryItem } from '../../lib/jewelry-store';
import { useState } from 'react';
import { notifyOperationSuccess, notifyOperationError } from '../../lib/sound-notifications';
import { validateMediaFile, verifyStoredMedia } from '../../lib/media-validation';
import { vintedSourceUrl } from '../../lib/vinted-refresh';
import { findVintedImportDuplicate } from '../../lib/vinted-import';
import { db, storage } from '../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { ref as firebaseRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { BackOfficeSharedState } from './backoffice-types';
import type { CatalogOptions } from './useCatalogOptions';
import type { CatalogHistoryController } from './useCatalogHistory';

type VintedCatalogDependencies = Pick<BackOfficeSharedState, 'currentUser' | 'jewelryList'> &
    Pick<CatalogOptions, 'ensureShopCategoryOrder' | 'rememberCustomValues'> &
    Pick<CatalogHistoryController, 'pushVersionHistory'>;

export function useVintedCatalog(dependencies: VintedCatalogDependencies) {
    const {
        currentUser, ensureShopCategoryOrder, jewelryList, pushVersionHistory, rememberCustomValues
    } = dependencies;

    const [isVintedImportOpen, setIsVintedImportOpen] = useState(false);
    const [vintedLinksText, setVintedLinksText] = useState('');
    const [vintedImportItems, setVintedImportItems] = useState([]);
    const [vintedImportStatus, setVintedImportStatus] = useState('');
    const [vintedImportError, setVintedImportError] = useState('');
    const [isVintedImportWorking, setIsVintedImportWorking] = useState(false);
    const [isRefreshingSelectedVintedItems, setIsRefreshingSelectedVintedItems] = useState(false);
    const [vintedRefreshResult, setVintedRefreshResult] = useState(null);
    const [copyVintedImages, setCopyVintedImages] = useState(true);
    const [vintedPricingSettings, setVintedPricingSettings] = useState(() => {
        const defaults = { buyerFixed: 0.70, buyerPercent: 5, shippingMin: 1.55, rounding: 'up_050' };
        try {
            const saved = JSON.parse(localStorage.getItem('aram_vinted_fee_settings') || 'null');
            return saved && typeof saved === 'object' ? { ...defaults, ...saved } : defaults;
        } catch {
            return defaults;
        }
    });

    const [vintedPreviewImage, setVintedPreviewImage] = useState(null);

    const splitVintedList = (value) => String(value || '')
    .split(/[;,]/)
    .map(part => part.trim())
    .filter(Boolean);

    const normalizeVintedPrice = (value) => {
        const cleaned = String(value || '').replace('€', '').replace(',', '.').replace(/[^\d.]/g, '');
        return cleaned ? Number(cleaned) : 0;
    };

    const parseVintedMoney = (value) => {
        const parsed = Number(String(value ?? '').replace('€', '').replace(',', '.').replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const calculateVintedAdjustedPrice = (basePrice, settings = vintedPricingSettings) => {
        const base = parseVintedMoney(basePrice);
        const total = base > 0
            ? base + parseVintedMoney(settings.buyerFixed) + base * parseVintedMoney(settings.buyerPercent) / 100 + parseVintedMoney(settings.shippingMin)
            : 0;
        const rounded = settings.rounding === 'none' ? Math.round(total * 100) / 100 : Math.ceil(total * 2) / 2;
        return Number(rounded.toFixed(2));
    };

    // Throttle consecutive product-page requests to reduce the chance of
    // Vinted rate-limiting a multi-link import. There is deliberately no
    // wait before the first request.
    const VINTED_REQUEST_DELAY_MS = 2000;

    const waitForVintedRequestWindow = () => new Promise(resolve => window.setTimeout(resolve, VINTED_REQUEST_DELAY_MS));

    const uniqueVintedUrls = (urls) => [...new Set<string>((urls || [])
    .map(url => String(url || '').trim())
    .filter(Boolean))];

    const getVintedApis = () => {
        const isHostedAdmin = window.location.protocol !== 'file:' && !/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname);
        const localApi = window.location.protocol === 'file:' ? 'http://127.0.0.1:3000' : '';
        return {
            link: isHostedAdmin ? '/api/vinted-link' : `${localApi}/api/vinted-link`,
            image: isHostedAdmin ? '/api/image-proxy' : `${localApi}/api/image-proxy`
        };
    };

    const previewVintedImageSrc = (url) => (/images\d*\.vinted\.net/i.test(url)
    ? `${getVintedApis().image}?url=${encodeURIComponent(url)}`
    : url);

    const mapVintedRowToAram = (row) => {
        const sourceUrl = String(row.url || '').trim();
        const condition = String(row.condition || '').trim();
        const description = String(row.description || '').trim();
        const imageUrls = uniqueVintedUrls([...(Array.isArray(row.photos) ? row.photos : []), ...(Array.isArray(row.images) ? row.images : []), ...splitVintedList(row.image_urls)])
            .filter(url => !/logo|avatar|icon|placeholder|blur|thumbnail|sprite/i.test(url));
        const normalizedStatus = String(row.status || 'Διαθέσιμο').trim();
        const mediaList = imageUrls.map(imageUrl => ({
            url: imageUrl,
            type: 'image',
            showInShop: true,
            external: true,
            source: 'vinted'
        }));

        return {
            name: String(row.title || row.name || '').trim(),
            description,
            category: String(row.category || 'Άλλα').trim(),
            collection: '',
            status: String(row.status || 'Διαθέσιμο').trim(),
            creationDate: new Date().toISOString().split('T')[0],
            price: normalizeVintedPrice(row.price),
            vintedBasePrice: normalizeVintedPrice(row.vintedBasePrice ?? row.price),
            vintedPricing: row.vintedPricing || null,
            vintedFavorites: Number(row.vintedFavorites ?? row.favorites ?? row.favoritesCount ?? 0) || 0,
            vintedViews: Number(row.vintedViews ?? row.views ?? row.viewCount ?? 0) || 0,
            cost: 0,
            stock: normalizedStatus === 'Πουλήθηκε' ? 0 : Number(row.stock ?? 1),
            shopOrder: 0,
            weight: '',
            dimensions: '',
            storage: '',
            materials: splitVintedList(Array.isArray(row.materials) ? row.materials.join(',') : row.materials),
            colors: splitVintedList(Array.isArray(row.colors) ? row.colors.join(',') : row.colors),
            platforms: sourceUrl ? ['Vinted'] : [],
            productLinks: sourceUrl ? [{ site: 'Vinted', url: sourceUrl }] : [],
            purchaseLinks: sourceUrl ? [{ site: 'Vinted', url: sourceUrl }] : [],
            postedPlatforms: sourceUrl ? [{ site: 'Vinted', url: sourceUrl, showInShop: true }] : [],
            notes: description || '',
            imageUrl: mediaList[0]?.url || '',
            images: imageUrls,
            fileType: 'image',
            mediaList,
            media: mediaList,
            sourcePlatform: 'vinted',
            sourceId: String(row.vinted_id || row.id || '').trim(),
            sourceUrl
        };
    };

    const updateVintedPreviewItem = (indexToUpdate, patch) => {
        setVintedImportItems(prev => prev.map((item, index) => (
            index === indexToUpdate ? { ...item, ...patch } : item
        )));
    };

    const removeVintedPreviewMedia = (itemIndex, mediaIndex) => {
        setVintedImportItems(prev => prev.map((item, index) => {
            if (index !== itemIndex) return item;
            const mediaList = (item.mediaList || []).filter((_, idx) => idx !== mediaIndex);
            return {
                ...item,
                mediaList,
                media: mediaList,
                imageUrl: mediaList[0]?.url || '',
                fileType: mediaList[0]?.type || 'image'
            };
        }));
    };

    const handleFetchVintedLinks = async () => {
        const links = uniqueVintedUrls(vintedLinksText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean));

        if (!links.length) {
            setVintedImportError('Βάλε πρώτα ένα ή περισσότερα Vinted links.');
            return;
        }

        setIsVintedImportWorking(true);
        setVintedImportError('');
        const fetchedItems = [];
        const errors = [];
        const skippedDuplicates = [];

        try {
            for (let index = 0; index < links.length; index += 1) {
                const link = links[index];
                const knownBeforeFetch = findVintedImportDuplicate(
                    { sourcePlatform: 'vinted', sourceUrl: link },
                    [...jewelryList, ...vintedImportItems, ...fetchedItems]
                );
                if (knownBeforeFetch) {
                    skippedDuplicates.push(knownBeforeFetch.item.name || knownBeforeFetch.item.title || link);
                    continue;
                }
                if (index > 0) await waitForVintedRequestWindow();
                setVintedImportStatus(`Τραβάω στοιχεία από Vinted link ${index + 1}/${links.length}...`);
                try {
                    const response = await fetch(`${getVintedApis().link}?url=${encodeURIComponent(link)}`);
                    const responseText = await response.text();
                    let data;
                    try { data = JSON.parse(responseText); }
                    catch { throw new Error(`Το API επέστρεψε μη έγκυρη απάντηση (HTTP ${response.status}).`); }
                    if (!response.ok || !data.ok) {
                        errors.push(`${link}: ${data.error || 'άγνωστο σφάλμα'}`);
                        continue;
                    }
                    const item = mapVintedRowToAram(data.item || {});
                    const basePrice = normalizeVintedPrice(data.item?.price);
                    const adjustedPrice = calculateVintedAdjustedPrice(basePrice);
                    item.vintedBasePrice = basePrice;
                    item.price = adjustedPrice;
                    item.vintedPricing = {
                        vintedBasePrice: basePrice,
                        buyerFixed: parseVintedMoney(vintedPricingSettings.buyerFixed),
                        buyerPercent: parseVintedMoney(vintedPricingSettings.buyerPercent),
                        shippingMin: parseVintedMoney(vintedPricingSettings.shippingMin),
                        estimatedTotal: basePrice + parseVintedMoney(vintedPricingSettings.buyerFixed) + basePrice * parseVintedMoney(vintedPricingSettings.buyerPercent) / 100 + parseVintedMoney(vintedPricingSettings.shippingMin),
                        sitePrice: adjustedPrice,
                        rounding: vintedPricingSettings.rounding,
                        parcelProfile: 'small_parcel_gr'
                    };
                    item.vintedFavorites = Number(data.item?.favorites ?? data.item?.favoritesCount ?? 0) || 0;
                    item.vintedViews = Number(data.item?.views ?? data.item?.viewCount ?? 0) || 0;
                    const duplicate = findVintedImportDuplicate(
                        item,
                        [...jewelryList, ...vintedImportItems, ...fetchedItems]
                    );
                    if (item.name && !duplicate) {
                        fetchedItems.push(item);
                    } else if (duplicate) {
                        skippedDuplicates.push(duplicate.item.name || duplicate.item.title || item.name || link);
                    } else if (!item.name) {
                        errors.push(`${link}: δεν βρέθηκε τίτλος καταχώρησης.`);
                    }
                } catch (err) {
                    errors.push(`${link}: ${err.message || 'δεν απάντησε το Vinted importer'}.`);
                }
            }

            setVintedImportItems(prev => [...prev, ...fetchedItems]);
            const suffix = errors.length ? ` Σφάλματα: ${errors.join(' | ')}` : '';
            const duplicateSummary = skippedDuplicates.length
                ? ` Παραλείφθηκαν ${skippedDuplicates.length} ήδη υπάρχοντα: ${skippedDuplicates.join(', ')}.`
                : '';
            setVintedImportStatus(`Βρέθηκαν ${fetchedItems.length} νέα προϊόντα. Σύνολο preview: ${vintedImportItems.length + fetchedItems.length}.${duplicateSummary}${suffix}`);
            if (errors.length) setVintedImportError(errors.join(' | '));
        } finally {
            setIsVintedImportWorking(false);
        }
    };

    const getVintedSourceUrl = vintedSourceUrl;

    const extensionFromContentType = (contentType) => {
        if (/png/i.test(contentType || '')) return 'png';
        if (/webp/i.test(contentType || '')) return 'webp';
        if (/gif/i.test(contentType || '')) return 'gif';
        return 'jpg';
    };

    const uploadVintedExternalImage = async (imageUrl, item, mediaIndex) => {
        const response = await fetch(`${getVintedApis().image}?url=${encodeURIComponent(imageUrl)}`);
        if (!response.ok) {
            throw new Error(`Δεν μπόρεσα να αντιγράψω εικόνα από Vinted (${response.status}).`);
        }

        const sourceBlob = await response.blob();
        await validateMediaFile(sourceBlob, 'image');
        const blob = await compressImageBlob(sourceBlob, 1400, 0.85);
        const validated = await validateMediaFile(blob, 'image');
        const ext = extensionFromContentType(blob.type);
        const safeName = String(item.sourceId || item.name || 'vinted-item')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'vinted-item';
        const storagePath = `jewelry/vinted-imports/${Date.now()}-${safeName}-${mediaIndex + 1}.${ext}`;
        const storageRef = firebaseRef(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, blob, {
            contentType: validated.mime,
            cacheControl: 'public, max-age=31536000, immutable'
        });

        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, resolve);
        });

        let downloadUrl;
        try {
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await verifyStoredMedia(downloadUrl, 'image');
        } catch (verificationError) {
            await deleteObject(uploadTask.snapshot.ref).catch(() => undefined);
            throw verificationError;
        }
        return {
            media: {
                url: downloadUrl,
                type: 'image',
                showInShop: true,
                source: 'vinted',
                originalUrl: imageUrl
            },
            storageRef: uploadTask.snapshot.ref
        };
    };

    const prepareVintedItemForImport = async (item, itemIndex, totalItems) => {
        const sourceMedia = item.mediaList || item.media || [];
        if (!copyVintedImages || !sourceMedia.length) {
            return {
                item: {
                    ...item,
                    mediaList: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                    media: sourceMedia.map(media => ({ ...media, showInShop: media.showInShop !== false })),
                    imageUrl: sourceMedia[0]?.url || item.imageUrl || ''
                },
                uploadedStorageRefs: []
            };
        }

        const uploadedMedia = [];
        const uploadedStorageRefs = [];
        const copyWarnings = [];
        for (let mediaIndex = 0; mediaIndex < sourceMedia.length; mediaIndex += 1) {
            const media = sourceMedia[mediaIndex];
            if (!media?.url || media.url.includes('firebasestorage.googleapis.com')) {
                uploadedMedia.push({ ...media, showInShop: media.showInShop !== false });
                continue;
            }

            setVintedImportStatus(`Αντιγράφω εικόνα ${mediaIndex + 1}/${sourceMedia.length} για προϊόν ${itemIndex + 1}/${totalItems}...`);
            try {
                const uploaded = await uploadVintedExternalImage(media.url, item, mediaIndex);
                uploadedMedia.push(uploaded.media);
                uploadedStorageRefs.push(uploaded.storageRef);
            } catch (err) {
                copyWarnings.push(`εικόνα ${mediaIndex + 1}: ${err.message}`);
                // Keep the listing usable when Firebase Storage temporarily rejects a copy.
                uploadedMedia.push({ ...media, showInShop: media.showInShop !== false, external: true });
            }
        }

        return {
            item: {
                ...item,
                imageUrl: uploadedMedia[0]?.url || item.imageUrl || '',
                fileType: uploadedMedia[0]?.type || item.fileType || 'image',
                mediaList: uploadedMedia,
                media: uploadedMedia,
                notes: [
                    item.notes || '',
                    copyWarnings.length ? `Προσοχή: Δεν αντιγράφηκαν όλες οι Vinted εικόνες στο Firebase Storage (${copyWarnings.join('; ')}).` : ''
                ].filter(Boolean).join('\n')
            },
            uploadedStorageRefs
        };
    };

    const handleImportVintedItems = async () => {
        if (!currentUser) {
            setVintedImportError('Πρώτα κάνε σύνδεση στο Back Office.');
            return;
        }
        if (!vintedImportItems.length) {
            setVintedImportError('Πρώτα τράβηξε προϊόντα από Vinted links.');
            return;
        }

        setIsVintedImportWorking(true);
        setVintedImportError('');
        let imported = 0;
        let skippedDuplicates = 0;
        let pendingImportStorageRefs = [];
        const importedInRun = [];

        try {
            for (let index = 0; index < vintedImportItems.length; index += 1) {
                const rawItem = vintedImportItems[index];
                const duplicate = findVintedImportDuplicate(rawItem, [...jewelryList, ...importedInRun]);
                if (duplicate) {
                    skippedDuplicates += 1;
                    setVintedImportStatus(`Import σε εξέλιξη: ${imported} νέα, ${skippedDuplicates} ήδη υπάρχοντα`);
                    continue;
                }
                if (!(Number(rawItem.price) > 0)) {
                    throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει έγκυρη τιμή. Συμπλήρωσε τιμή στην προεπισκόπηση.`);
                }
                if (!(rawItem.mediaList || []).length) {
                    throw new Error(`Το προϊόν «${rawItem.name || index + 1}» δεν έχει φωτογραφίες. Πρόσθεσε τουλάχιστον μία φωτογραφία ή αφαίρεσέ το από το preview.`);
                }
                const preparedImport = await prepareVintedItemForImport(rawItem, index, vintedImportItems.length);
                const item = preparedImport.item;
                pendingImportStorageRefs = preparedImport.uploadedStorageRefs;
                if (copyVintedImages && !(item.mediaList || []).length) {
                    throw new Error(`Δεν αντιγράφηκαν φωτογραφίες για το προϊόν «${rawItem.name || index + 1}». Το προϊόν δεν αποθηκεύτηκε.`);
                }
                const catTrimmed = item.category?.trim() || 'Κολιέ';
                await ensureShopCategoryOrder(catTrimmed);
                rememberCustomValues({
                    category: catTrimmed,
                    colors: item.colors || [],
                    materials: item.materials || []
                });

                const { media, description, ...docItem } = item;
                const itemData = {
                    ...docItem,
                    category: catTrimmed,
                    collection: '',
                    platforms: (item.postedPlatforms || []).map(platform => platform.site),
                    productLinks: item.purchaseLinks || [],
                    purchaseLinks: item.purchaseLinks || [],
                    postedPlatforms: item.postedPlatforms || [],
                    mediaList: item.mediaList || [],
                    images: (item.mediaList || []).map(mediaEntry => mediaEntry.url),
                    imageUrl: item.imageUrl || item.mediaList?.[0]?.url || '',
                    fileType: item.fileType || 'image',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                const docRef = await addJewelryItem(db, itemData);
                pendingImportStorageRefs = [];
                pushVersionHistory({
                    type: 'ADD',
                    id: docRef.id,
                    name: itemData.name || 'Vinted προϊόν',
                    message: 'Import από Vinted',
                    before: null,
                    after: { ...itemData, id: docRef.id }
                });
                imported += 1;
                importedInRun.push(rawItem);
                setVintedImportStatus(`Import σε εξέλιξη: ${imported}/${vintedImportItems.length}`);
            }

            const skippedSummary = skippedDuplicates ? ` Παραλείφθηκαν ${skippedDuplicates} ήδη υπάρχοντα.` : '';
            setVintedImportStatus(`Έτοιμο. Περάστηκαν ${imported} νέα προϊόντα στο Back Office.${skippedSummary}`);
            setVintedImportItems([]);
            setVintedLinksText('');
            notifyOperationSuccess('Εισαγωγή από Vinted', `Περάστηκαν ${imported} νέα προϊόντα.${skippedSummary}`);
        } catch (err) {
            if (pendingImportStorageRefs.length) {
                await Promise.allSettled(pendingImportStorageRefs.map(storageRef => deleteObject(storageRef)));
            }
            setVintedImportError(`Σφάλμα import μετά από ${imported} προϊόντα: ${err.message}`);
            notifyOperationError('Σφάλμα Εισαγωγής Vinted', err.message);
        } finally {
            setIsVintedImportWorking(false);
        }
    };

    const removeVintedPreviewItem = (indexToRemove) => {
        setVintedImportItems(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    return {
        isVintedImportOpen, setIsVintedImportOpen, vintedLinksText, setVintedLinksText, vintedImportItems,
        setVintedImportItems, vintedImportStatus, setVintedImportStatus, vintedImportError,
        setVintedImportError, isVintedImportWorking, vintedRefreshResult, copyVintedImages,
        setCopyVintedImages, vintedPricingSettings, setVintedPricingSettings, vintedPreviewImage,
        setVintedPreviewImage, splitVintedList, normalizeVintedPrice, parseVintedMoney,
        calculateVintedAdjustedPrice, getVintedApis, previewVintedImageSrc, updateVintedPreviewItem,
        removeVintedPreviewMedia, handleFetchVintedLinks, getVintedSourceUrl, handleImportVintedItems,
        removeVintedPreviewItem
    };
}

export type VintedCatalog = ReturnType<typeof useVintedCatalog>;
