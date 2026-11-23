import { BASE_CATEGORIES, BASE_STATUSES } from './catalog-config';
import { buildHistoryEntryFromAction } from './useCatalogHistory';
import { sanitizeVintedDescription as stripVintedCondition } from '../../lib/vinted-sanitizer';
import { assertUnchangedInventory, assertInventoryChangeAllowed, inventoryLabel } from '../../lib/stock-edit';
import { addJewelryItem, writeJewelryChanges } from '../../lib/jewelry-store';
import { stageHistory, equalHistoryValue } from '../../lib/catalog-history';
import { notifyOperationSuccess, notifyOperationError } from '../../lib/sound-notifications';
import { validateMediaFile, validatePreparedMedia, verifyStoredMedia } from '../../lib/media-validation';
import { db, storage } from '../../firebase';
import { doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { ref as firebaseRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { CatalogRecord } from './backoffice-types';
import type { ProductWorkspace } from './useProductWorkspace';
import type { CatalogPreferences } from './useCatalogPreferences';
import type { CatalogOptions } from './useCatalogOptions';
import type { BackOfficeSharedState } from './backoffice-types';
import type { BackOfficeUploads } from './useBackOfficeUploads';
import type { CatalogHistoryController } from './useCatalogHistory';
import type { ProductMedia } from './useProductMedia';

type ProductActionsDependencies = Pick<
    ProductWorkspace,
    'closeItemEditor' | 'currentItem' | 'formCategory' | 'formCollection' | 'formColorsArr' | 'formCost' |
    'formDate' | 'formDimensions' | 'formManualLikes' | 'formManualViews' | 'formMaterials' | 'formName' |
    'formNotes' | 'formEnglishCopy' | 'formOriginalPrice' | 'formPostedPlatforms' | 'formPrice' | 'formPrivateMediaList' |
    'formPurchaseLinks' | 'formShopMediaList' | 'formShopOrder' | 'formStatus' | 'formStock' | 'formStorage' |
    'formWeight' | 'isDetailOpen' | 'isEditMode' | 'setActiveDetailMediaIdx' | 'setCurrentItem' |
    'setFormCategory' | 'setFormCollection' | 'setFormColorsArr' | 'setFormCost' | 'setFormDate' |
    'setFormDimensions' | 'setFormManualLikes' | 'setFormManualViews' | 'setFormMaterials' | 'setFormName' |
    'setFormNotes' | 'setFormEnglishCopy' | 'setFormOriginalPrice' | 'setFormPostedPlatforms' | 'setFormPrice' |
    'setFormPrivateMediaList' | 'setFormPurchaseLinks' | 'setFormShopMediaList' | 'setFormShopOrder' |
    'setFormStatus' | 'setFormStock' | 'setFormStorage' | 'setFormWeight' | 'setIsAddOpen' |
    'setIsCustomCategory' | 'setIsCustomCollection' | 'setIsCustomPostedSite' | 'setIsCustomPurchaseSite' |
    'setIsCustomStatus' | 'setIsCustomStorage' | 'setIsDetailOpen' | 'setIsEditMode' | 'setNewColorInput' |
    'setNewMaterialInput' | 'setNewPostedSite' | 'setNewPostedUrl' | 'setNewPostedVisible' |
    'setNewPurchaseSite' | 'setNewPurchaseUrl'
> &
    Pick<CatalogPreferences, 'customCategories' | 'customStatuses' | 'setCustomCategories' | 'setCustomStatuses'> &
    Pick<CatalogOptions, 'ensureShopCategoryOrder' | 'rememberCustomValues'> &
    Pick<BackOfficeSharedState, 'isSaving' | 'jewelryList' | 'setIsSaving'> &
    Pick<BackOfficeUploads, 'mediaPreparing' | 'setUploadProgress' | 'setUploadStatus'> &
    Pick<CatalogHistoryController, 'pushUndoAction' | 'pushVersionHistory'> &
    Pick<ProductMedia, 'refreshSmartSuggestionsFromMain' | 'setSmartSuggestions'>;

/** Product CRUD actions, with media validation and atomic edit/history writes. */
export function createProductActions(dependencies: ProductActionsDependencies) {
    const {
        closeItemEditor, currentItem, customCategories, customStatuses, ensureShopCategoryOrder, formCategory,
        formCollection, formColorsArr, formCost, formDate, formDimensions, formManualLikes, formManualViews,
        formMaterials, formName, formNotes, formEnglishCopy, formOriginalPrice, formPostedPlatforms, formPrice,
        formPrivateMediaList, formPurchaseLinks, formShopMediaList, formShopOrder, formStatus, formStock,
        formStorage, formWeight, isDetailOpen, isEditMode, isSaving, jewelryList, mediaPreparing,
        pushUndoAction, pushVersionHistory, refreshSmartSuggestionsFromMain, rememberCustomValues,
        setActiveDetailMediaIdx, setCurrentItem, setCustomCategories, setCustomStatuses, setFormCategory,
        setFormCollection, setFormColorsArr, setFormCost, setFormDate, setFormDimensions, setFormManualLikes,
        setFormManualViews, setFormMaterials, setFormName, setFormNotes, setFormEnglishCopy, setFormOriginalPrice,
        setFormPostedPlatforms, setFormPrice, setFormPrivateMediaList, setFormPurchaseLinks,
        setFormShopMediaList, setFormShopOrder, setFormStatus, setFormStock, setFormStorage, setFormWeight,
        setIsAddOpen, setIsCustomCategory, setIsCustomCollection, setIsCustomPostedSite,
        setIsCustomPurchaseSite, setIsCustomStatus, setIsCustomStorage, setIsDetailOpen, setIsEditMode,
        setIsSaving, setNewColorInput, setNewMaterialInput, setNewPostedSite, setNewPostedUrl,
        setNewPostedVisible, setNewPurchaseSite, setNewPurchaseUrl, setSmartSuggestions, setUploadProgress,
        setUploadStatus
    } = dependencies;

    const handleOpenAdd = () => {
        setIsEditMode(false);
        setCurrentItem(null);
        setIsDetailOpen(false);
        setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

        setFormName(''); setFormCategory('Κολιέ'); setFormCollection(''); setFormStatus('Διαθέσιμο'); setFormDate(new Date().toISOString().split('T')[0]);
        setFormPrice(''); setFormOriginalPrice(''); setFormCost(''); setFormStock(1); setFormShopOrder(0); setFormManualLikes(0); setFormManualViews(0); setFormWeight(''); setFormDimensions(''); setFormStorage('');
        setFormMaterials([]); setFormColorsArr([]); setNewMaterialInput(''); setNewColorInput('');

        setFormPurchaseLinks([]); setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);
        setFormPostedPlatforms([]); setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

        setFormNotes('');
        setFormEnglishCopy({ title: '', description: '' });
        setFormShopMediaList([]);
        setFormPrivateMediaList([]);
        setUploadProgress(0); setUploadStatus('');
        setSmartSuggestions(null);

        const draftStr = localStorage.getItem('aram_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (window.confirm('Υπάρχει αποθηκευμένο πρόχειρο. Θέλετε να το συνεχίσετε;')) {
                    setFormName(draft.formName || '');
                    setFormCategory(draft.formCategory || 'Κολιέ');
                    setFormCollection(draft.formCollection || '');
                    setFormStatus(draft.formStatus || 'Διαθέσιμο');
                    setFormDate(draft.formDate || new Date().toISOString().split('T')[0]);
                    setFormPrice(draft.formPrice || '');
                    setFormCost(draft.formCost || '');
                    setFormStock(draft.formStock ?? 1);
                    setFormShopOrder(0);
                    setFormWeight(draft.formWeight || '');
                    setFormDimensions(draft.formDimensions || '');
                    setFormStorage(draft.formStorage || '');
                    setFormNotes(draft.formNotes || '');
                    setFormEnglishCopy({ title: String(draft.formEnglishCopy?.title || ''), description: String(draft.formEnglishCopy?.description || '') });
                    setFormMaterials(draft.formMaterials || []);
                    setFormColorsArr(draft.formColorsArr || []);
                    setFormPurchaseLinks(draft.formPurchaseLinks || []);
                    setFormPostedPlatforms(draft.formPostedPlatforms || []);
                } else {
                    localStorage.removeItem('aram_draft');
                }
            } catch (err) {
                localStorage.removeItem('aram_draft');
            }
        }

        setIsAddOpen(true);
    };

    const handleOpenEdit = (item) => {
        setIsEditMode(true); setCurrentItem(item);
        setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

        setFormName(item.name || ''); setFormCategory(item.category || 'Κολιέ'); setFormCollection(item.collection || ''); setFormStatus(item.status ? inventoryLabel(item) : 'Διαθέσιμο'); setFormDate(item.creationDate || '');
        setFormPrice(item.price ? item.price.toString() : ''); setFormOriginalPrice(item.originalPrice ? item.originalPrice.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock ?? 1); setFormShopOrder(item.shopOrder || 0); setFormManualLikes(Math.max(0, Number(item.shopFavorites ?? item.likes ?? 0) || 0)); setFormManualViews(Math.max(0, Number(item.views ?? item.viewCount ?? 0) || 0));
        setFormWeight(item.weight || ''); setFormDimensions(item.dimensions || ''); setFormStorage(item.storage || '');
        setFormMaterials(item.materials || []); setFormColorsArr(item.colors || []); setFormNotes(stripVintedCondition(item.notes || ''));
        setFormEnglishCopy({ title: item.titleEn || '', description: item.descriptionEn || '' });

        const existingPurchaseLinks = item.purchaseLinks || item.productLinks || [];
        setFormPurchaseLinks(existingPurchaseLinks);
        setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);

        const existingPosted = item.postedPlatforms || (item.platforms ? item.platforms.map(p => ({ site: p, url: '', showInShop: true })) : []);
        setFormPostedPlatforms(existingPosted);
        setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

        const existingMedia = item.mediaList || (item.imageUrl ? [{ url: item.imageUrl, type: item.fileType || 'image', showInShop: true }] : []);
        const shopMedia = existingMedia.filter(m => m.showInShop !== false).map(m => ({ ...m, isNew: false }));
        const privateMedia = existingMedia.filter(m => m.showInShop === false).map(m => ({ ...m, isNew: false }));

        setFormShopMediaList(shopMedia);
        setFormPrivateMediaList(privateMedia);

        setUploadProgress(0); setUploadStatus('');
        setSmartSuggestions(null);
        refreshSmartSuggestionsFromMain(shopMedia);
        setIsAddOpen(true);
    };

    const handleCloneItem = (item) => {
        setIsEditMode(false);
        setCurrentItem(null);
        setIsCustomCategory(false); setIsCustomCollection(false); setIsCustomStatus(false); setIsCustomStorage(false);

        setFormName(item.name ? item.name + ' (Αντίγραφο)' : '');
        setFormCategory(item.category || 'Κολιέ'); setFormCollection(item.collection || ''); setFormStatus(item.status || 'Διαθέσιμο'); setFormDate(item.creationDate || new Date().toISOString().split('T')[0]);
        setFormPrice(item.price ? item.price.toString() : ''); setFormOriginalPrice(item.originalPrice ? item.originalPrice.toString() : ''); setFormCost(item.cost ? item.cost.toString() : ''); setFormStock(item.stock || 1); setFormShopOrder(0);
        setFormWeight(item.weight || ''); setFormDimensions(item.dimensions || ''); setFormStorage(item.storage || '');
        setFormMaterials(item.materials || []); setFormColorsArr(item.colors || []); setFormNotes(item.notes || '');
        setFormEnglishCopy({ title: item.titleEn || '', description: item.descriptionEn || '' });

        const existingPurchaseLinks = item.purchaseLinks || item.productLinks || [];
        setFormPurchaseLinks(existingPurchaseLinks);
        setNewPurchaseSite('Vinted'); setNewPurchaseUrl(''); setIsCustomPurchaseSite(false);

        const existingPosted = item.postedPlatforms || (item.platforms ? item.platforms.map(p => ({ site: p, url: '', showInShop: true })) : []);
        setFormPostedPlatforms(existingPosted);
        setNewPostedSite('Instagram'); setNewPostedUrl(''); setNewPostedVisible(false); setIsCustomPostedSite(false);

        setFormShopMediaList([]);
        setFormPrivateMediaList([]);
        setUploadProgress(0); setUploadStatus('');
        setSmartSuggestions(null);
        setIsAddOpen(true);
        setIsDetailOpen(false);
    };

    const handleQuickSold = async (e, item) => {
        e.stopPropagation();
        if (!window.confirm('Να σημειωθεί η δημιουργία ως Πουλημένη (Απόθεμα: 0);')) return;
        try {
            const newData = {
                status: 'Πουλήθηκε',
                stock: 0,
                updatedAt: serverTimestamp()
            };
            await writeJewelryChanges(db, [{ id: item.id, patch: newData, baseline: item }]);
            pushUndoAction({
                type: 'UPDATE',
                id: item.id,
                oldData: { status: item.status, stock: item.stock },
                newData,
                message: 'Μαρκαρίστηκε ως Πουλημένο.'
            });
        } catch(err) {
            alert("Αποτυχία ενημέρωσης: " + err.message);
        }
    };

    const handleViewDetails = (item) => {
        setCurrentItem(item);
        setActiveDetailMediaIdx(0);
        setIsDetailOpen(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        if (!formName.trim() || isSaving || mediaPreparing) return;

        const parsedPrice = formPrice === '' ? 0 : Number(formPrice);
        const parsedOriginalPrice = formOriginalPrice === '' ? null : Number(formOriginalPrice);
        const parsedCost = formCost === '' ? 0 : Number(formCost);
        const parsedStock = formStock === '' ? 1 : parseInt(formStock as string, 10);
        const parsedShopOrder = isEditMode && currentItem ? parseInt(formShopOrder || currentItem.shopOrder || 0, 10) : 0;
        if ([parsedPrice, parsedCost, parsedStock, parsedShopOrder].some(value => Number.isNaN(value)) || parsedPrice < 0 || parsedCost < 0 || parsedStock < 0 || parsedShopOrder < 0) {
            alert("Ελέγξτε τιμή, κόστος και απόθεμα. Επιτρέπονται μόνο μη αρνητικοί αριθμοί.");
            return;
        }

        const allFormMedia = [...formShopMediaList, ...formPrivateMediaList];
        if (allFormMedia.length === 0) return alert("Παρακαλώ προσθέστε τουλάχιστον 1 φωτογραφία ή βίντεο!");

        setIsSaving(true);
        setUploadProgress(0);
        setUploadStatus('Προετοιμασία...');
        const uploadedStorageRefs = [];
        let catalogSaved = false;

        try {
            const catTrimmed = formCategory.trim() || 'Άλλο';
            if (!BASE_CATEGORIES.includes(catTrimmed) && !customCategories.includes(catTrimmed)) {
                setCustomCategories(prev => [...prev, catTrimmed]);
            }
            await ensureShopCategoryOrder(catTrimmed);

            const statTrimmed = formStatus.trim() || 'Διαθέσιμο';
            if (!BASE_STATUSES.includes(statTrimmed) && !customStatuses.includes(statTrimmed)) {
                setCustomStatuses(prev => [...prev, statTrimmed]);
            }

            const colTrimmed = formCollection.trim();
            rememberCustomValues({ category: catTrimmed, colors: formColorsArr, materials: formMaterials });

            const finalMediaUrls = [];
            const newFilesToUpload = allFormMedia.filter(m => m.isNew);
            const originalFilesToUpload = allFormMedia.filter(m => m.restoreBackup?.isNew && m.restoreBackup?.fileObj);
            const totalNewFiles = newFilesToUpload.length;
            const totalOriginalFiles = originalFilesToUpload.length;
            let filesUploadedCount = 0;
            let originalFilesUploadedCount = 0;


            const uploadMediaFile = async (fileObj, folder, statusLabel, countLabel) => {
                const expectedKind = (await validateMediaFile(fileObj)).kind;
                const validated = await validatePreparedMedia(fileObj, expectedKind);
                const safeName = fileObj.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'image.jpg';
                const uniqueName = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + safeName;
                const storageRef = firebaseRef(storage, folder + '/' + uniqueName);
                const uploadTask = uploadBytesResumable(storageRef, fileObj, {
                    contentType: validated.mime,
                    cacheControl: 'public, max-age=31536000, immutable'
                });

                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                            setUploadStatus(`${statusLabel} ${countLabel}... (${Math.round(progress)}%)`);
                        },
                        (error) => reject(error),
                        () => resolve()
                    );
                });

                let downloadUrl;
                try {
                    downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    await verifyStoredMedia(downloadUrl, expectedKind);
                } catch (verificationError) {
                    await deleteObject(uploadTask.snapshot.ref).catch(() => undefined);
                    throw verificationError;
                }
                uploadedStorageRefs.push(uploadTask.snapshot.ref);
                return downloadUrl;
            };

            const buildSavedMediaEntry = (media, url, originalUrl = '') => {
                const entry: CatalogRecord = {
                    url,
                    type: media.type || 'image',
                    showInShop: media.showInShop !== false
                };
                const restoreUrl = originalUrl || media.originalUrl || '';
                if (restoreUrl && restoreUrl !== url) {
                    entry.originalUrl = restoreUrl;
                    entry.originalType = media.originalType || media.restoreBackup?.type || media.type || 'image';
                    entry.originalFileName = media.originalFileName || media.restoreBackup?.fileName || media.fileName || '';
                    entry.edited = true;
                }
                return entry;
            };

            for (const media of allFormMedia) {
                if (!media.isNew) {
                    finalMediaUrls.push(buildSavedMediaEntry(media, media.url));
                } else {
                    filesUploadedCount++;
                    const downloadUrl = await uploadMediaFile(media.fileObj, 'jewelry', 'Ανέβασμα αρχείου', `${filesUploadedCount} από ${totalNewFiles}`);
                    let originalUrl = media.originalUrl || '';
                    if (!originalUrl && media.restoreBackup?.isNew && media.restoreBackup?.fileObj) {
                        originalFilesUploadedCount++;
                        originalUrl = await uploadMediaFile(media.restoreBackup.fileObj, 'jewelry/originals', 'Ανέβασμα αρχικής εικόνας για επαναφορά', `${originalFilesUploadedCount} από ${totalOriginalFiles}`);
                    } else if (!originalUrl && media.restoreBackup?.url && !media.restoreBackup.isNew && !/^(blob:|data:)/i.test(media.restoreBackup.url)) {
                        originalUrl = media.restoreBackup.url;
                    }
                    finalMediaUrls.push(buildSavedMediaEntry(media, downloadUrl, originalUrl));
                }
            }

            setUploadStatus('Αποθήκευση στοιχείων...');
            setUploadProgress(100);

            if (isEditMode && currentItem) {
            }

            const mainImage = finalMediaUrls.find(m => m.showInShop) || finalMediaUrls[0] || { url: '', type: 'image' };
            const sanitizedPurchaseLinks = formPurchaseLinks.map(l => ({ site: l.site || '', url: l.url || '' }));
            const sanitizedPostedPlatforms = formPostedPlatforms.map(p => ({ site: p.site || '', url: p.url || '', showInShop: p.showInShop !== false }));

            const previousCopy = isEditMode ? currentItem : null;
            const englishCopy = {
                titleEn: formEnglishCopy.title.trim().slice(0, 160),
                descriptionEn: formEnglishCopy.description.trim().slice(0, 2000),
            };
            const englishChanges = Object.fromEntries(
                Object.entries(englishCopy).filter(([field, value]) => value !== (previousCopy?.[field] || ''))
            );
            const itemData: CatalogRecord = {
                name: formName.trim(),
                category: catTrimmed,
                collection: colTrimmed,
                status: statTrimmed === 'Διαθέσιμο' && parsedStock === 0 ? 'Πουλήθηκε' : statTrimmed,
                creationDate: formDate,
                price: parsedPrice,
                originalPrice: parsedOriginalPrice && parsedOriginalPrice > parsedPrice ? parsedOriginalPrice : null,
                cost: parsedCost,
                stock: statTrimmed === 'Πουλήθηκε' ? 0 : parsedStock,
                shopOrder: parsedShopOrder,
                shopFavorites: Math.max(0, Math.trunc(Number(formManualLikes) || 0)),
                likes: Math.max(0, Math.trunc(Number(formManualLikes) || 0)),
                views: Math.max(0, Math.trunc(Number(formManualViews) || 0)),
                viewCount: Math.max(0, Math.trunc(Number(formManualViews) || 0)),
                weight: formWeight.trim(),
                dimensions: formDimensions.trim(),
                storage: formStorage.trim(),
                materials: formMaterials,
                colors: formColorsArr,
                platforms: sanitizedPostedPlatforms.map(p => p.site),
                productLinks: sanitizedPurchaseLinks,
                purchaseLinks: sanitizedPurchaseLinks,
                postedPlatforms: sanitizedPostedPlatforms,
                notes: stripVintedCondition(formNotes.trim()),
                ...englishChanges,
                imageUrl: mainImage.url,
                fileType: mainImage.type,
                mediaList: finalMediaUrls,
                updatedAt: serverTimestamp()
            };

            if (isEditMode && currentItem) {
                const action = await runTransaction(db, async tx => {
                    const productRef = doc(db, "jewelry", currentItem.id);
                    const snapshot = await tx.get(productRef);
                    if (!snapshot.exists()) throw new Error('Το προϊόν δεν υπάρχει πλέον.');
                    const latest = snapshot.data();
                    assertUnchangedInventory(currentItem, latest);
                    assertInventoryChangeAllowed(latest, itemData);
                    if (Object.keys(englishChanges).some(field => (latest[field] || '') !== (currentItem[field] || ''))) {
                        throw new Error('Το αγγλικό κείμενο άλλαξε από άλλη ενέργεια. Άνοιξε ξανά τη φόρμα.');
                    }
                    if (!equalHistoryValue(currentItem.mediaList, latest.mediaList) || currentItem.imageUrl !== latest.imageUrl) {
                        throw new Error('Οι εικόνες του προϊόντος άλλαξαν. Άνοιξε ξανά τη φόρμα.');
                    }
                    const mediaChanged = !equalHistoryValue(latest.mediaList, itemData.mediaList) || latest.imageUrl !== itemData.imageUrl;
                    const change = { type: 'UPDATE', id: currentItem.id, name: formName.trim(), oldData: latest, newData: itemData,
                        message: mediaChanged ? 'Αλλαγή εικόνων προϊόντος' : 'Επεξεργασία προϊόντος' };
                    tx.update(productRef, itemData);
                    stageHistory(db, tx, { ...buildHistoryEntryFromAction(change), timestamp: new Date().toISOString() });
                    return change;
                });
                catalogSaved = true;
                pushUndoAction(action, false);
            } else {
                itemData.createdAt = serverTimestamp();
                const docRef = await addJewelryItem(db, itemData);
                catalogSaved = true;
                pushVersionHistory({
                    type: 'ADD',
                    id: docRef.id,
                    name: formName.trim(),
                    message: 'Νέα καταχώρηση',
                    before: null,
                    after: { ...itemData, id: docRef.id }
                });
            }

            localStorage.removeItem('aram_draft');
            closeItemEditor();
            notifyOperationSuccess(
                isEditMode ? 'Ενημέρωση Προϊόντος' : 'Νέο Προϊόν',
                `Το προϊόν «${formName.trim()}» αποθηκεύτηκε επιτυχώς.`
            );
        } catch (err) {
            if (!catalogSaved && uploadedStorageRefs.length) {
                await Promise.allSettled(uploadedStorageRefs.map(storageRef => deleteObject(storageRef)));
            }
            notifyOperationError('Σφάλμα Αποθήκευσης', err.message);
            alert("Σφάλμα κατά την αποθήκευση: " + err.message);
        } finally {
            setIsSaving(false);
            setUploadStatus('');
            setUploadProgress(0);
        }
    };

    const handleDeleteItem = async (id, mediaArr, fallbackUrl) => {
        const itemForUndo = jewelryList.find(item => item.id === id) || null;
        if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη δημιουργία;')) return;
        try {
            await writeJewelryChanges(db, [{ id, remove: true, baseline: itemForUndo || undefined }]);
            if (itemForUndo) {
                pushUndoAction({
                    type: 'DELETE',
                    id,
                    data: itemForUndo,
                    message: 'Διαγράφηκε το "' + (itemForUndo.name || 'προϊόν') + '"'
                });
                pushVersionHistory({
                    type: 'DELETE',
                    id,
                    name: itemForUndo.name || 'προϊόν',
                    message: 'Διαγραφή προϊόντος',
                    before: itemForUndo,
                    after: null
                });
            }
            if (!itemForUndo) {
                const targets = mediaArr || (fallbackUrl ? [{ url: fallbackUrl }] : []);
                for (const t of targets) {
                    if (t.url && t.url.includes('firebasestorage.googleapis.com')) {
                        const fileRef = firebaseRef(storage, t.url);
                        await deleteObject(fileRef).catch(err => console.warn("Σφάλμα διαγραφής αρχείου:", err));
                    }
                }
            }
            if (isDetailOpen && currentItem && currentItem.id === id) setIsDetailOpen(false);
            notifyOperationSuccess('Διαγραφή Προϊόντος', `Το προϊόν ${itemForUndo?.name ? `«${itemForUndo.name}» ` : ''}διαγράφηκε επιτυχώς.`);
        } catch (err) {
            notifyOperationError('Σφάλμα Διαγραφής', err.message);
            alert("Αποτυχία διαγραφής: " + err.message);
        }
    };

    return {
        handleOpenAdd, handleOpenEdit, handleCloneItem, handleQuickSold, handleViewDetails, handleSaveItem,
        handleDeleteItem
    };
}

export type ProductActions = ReturnType<typeof createProductActions>;
