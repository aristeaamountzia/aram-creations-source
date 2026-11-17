import { normalizeShopSettings } from '../../shopSettings';
import { DEFAULT_SHOP_SETTINGS, MINIMAL_SHOP_SETTINGS } from './catalog-config';
import { DEFAULT_DESIGN_STUDIO } from '../../lib/design-studio';
import {
    DEFAULT_PORTFOLIO_DESIGN, normalizePortfolioDesign, validatePortfolioDesign
} from '../../lib/portfolio-settings';
import { portfolioHeroVideoUrl } from '../PortfolioHero';
import { useState, useEffect } from 'react';
import { notifyOperationSuccess, notifyOperationError } from '../../lib/sound-notifications';
import { validatePreparedMedia, verifyStoredMedia } from '../../lib/media-validation';
import { db, storage } from '../../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { ref as firebaseRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { CatalogPreferences } from './useCatalogPreferences';
import type { ShopSettings, BackOfficeSharedState } from './backoffice-types';
import type { BackOfficeUploads } from './useBackOfficeUploads';
import type { CatalogHistoryController } from './useCatalogHistory';

type ShopSettingsControllerDependencies = Pick<
    CatalogPreferences,
    'collectionOptionOrder' | 'colorOptionOrder' | 'customCategories' | 'customCollections' | 'customColors' |
    'customMaterials' | 'customPlatforms' | 'customStatuses' | 'hiddenCategoryOptions' |
    'hiddenCollectionOptions' | 'hiddenColorOptions' | 'hiddenMaterialOptions' | 'hiddenPlatformOptions' |
    'hiddenStatusOptions' | 'materialOptionOrder' | 'platformOptionOrder' | 'setCollectionOptionOrder' |
    'setColorOptionOrder' | 'setCustomCategories' | 'setCustomCollections' | 'setCustomColors' |
    'setCustomMaterials' | 'setCustomPlatforms' | 'setCustomStatuses' | 'setHiddenCategoryOptions' |
    'setHiddenCollectionOptions' | 'setHiddenColorOptions' | 'setHiddenMaterialOptions' |
    'setHiddenPlatformOptions' | 'setHiddenStatusOptions' | 'setMaterialOptionOrder' |
    'setPlatformOptionOrder' | 'setStatusOptionOrder' | 'statusOptionOrder'
> &
    Pick<BackOfficeSharedState, 'currentUser' | 'firebaseReady'> &
    Pick<BackOfficeUploads, 'mediaPreparing' | 'prepareLocalVideo' | 'setMediaPreparing' | 'setVideoProgress'> &
    Pick<CatalogHistoryController, 'pushVersionHistory'>;

/** Synchronize shop settings and shared custom preferences; manage hero uploads. */
export function useShopSettings(dependencies: ShopSettingsControllerDependencies) {
    const {
        collectionOptionOrder, colorOptionOrder, currentUser, customCategories, customCollections,
        customColors, customMaterials, customPlatforms, customStatuses, firebaseReady, hiddenCategoryOptions,
        hiddenCollectionOptions, hiddenColorOptions, hiddenMaterialOptions, hiddenPlatformOptions,
        hiddenStatusOptions, materialOptionOrder, mediaPreparing, platformOptionOrder, prepareLocalVideo,
        pushVersionHistory, setCollectionOptionOrder, setColorOptionOrder, setCustomCategories,
        setCustomCollections, setCustomColors, setCustomMaterials, setCustomPlatforms, setCustomStatuses,
        setHiddenCategoryOptions, setHiddenCollectionOptions, setHiddenColorOptions, setHiddenMaterialOptions,
        setHiddenPlatformOptions, setHiddenStatusOptions, setMaterialOptionOrder, setMediaPreparing,
        setPlatformOptionOrder, setStatusOptionOrder, setVideoProgress, statusOptionOrder
    } = dependencies;

    const [settingsLoadError, setSettingsLoadError] = useState('');
    const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
    const [heroUploadStatus, setHeroUploadStatus] = useState('');
    const [portfolioHeroUploadStatus, setPortfolioHeroUploadStatus] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('design');
    const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');
    const [activeFieldFilter, setActiveFieldFilter] = useState('all');
    const [draggedCategoryIdx, setDraggedCategoryIdx] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (!firebaseReady || !currentUser) return;
        const settingsDocRef = doc(db, "settings", "shop");
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            setSettingsLoadError('');
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (Array.isArray(data.customFields?.customCategories)) setCustomCategories(data.customFields.customCategories);
                if (Array.isArray(data.customFields?.customCollections)) setCustomCollections(data.customFields.customCollections);
                if (Array.isArray(data.customFields?.customStatuses)) setCustomStatuses(data.customFields.customStatuses);
                if (Array.isArray(data.customFields?.customMaterials)) setCustomMaterials(data.customFields.customMaterials);
                if (Array.isArray(data.customFields?.customPlatforms)) setCustomPlatforms(data.customFields.customPlatforms);
                if (Array.isArray(data.customFields?.customColors)) setCustomColors(data.customFields.customColors);
                if (Array.isArray(data.customFields?.statusOptionOrder)) setStatusOptionOrder(data.customFields.statusOptionOrder);
                if (Array.isArray(data.customFields?.collectionOptionOrder)) setCollectionOptionOrder(data.customFields.collectionOptionOrder);
                if (Array.isArray(data.customFields?.platformOptionOrder)) setPlatformOptionOrder(data.customFields.platformOptionOrder);
                if (Array.isArray(data.customFields?.colorOptionOrder)) setColorOptionOrder(data.customFields.colorOptionOrder);
                if (Array.isArray(data.customFields?.materialOptionOrder)) setMaterialOptionOrder(data.customFields.materialOptionOrder);
                if (Array.isArray(data.customFields?.hiddenCategoryOptions)) setHiddenCategoryOptions(data.customFields.hiddenCategoryOptions);
                if (Array.isArray(data.customFields?.hiddenStatusOptions)) setHiddenStatusOptions(data.customFields.hiddenStatusOptions);
                if (Array.isArray(data.customFields?.hiddenCollectionOptions)) setHiddenCollectionOptions(data.customFields.hiddenCollectionOptions);
                if (Array.isArray(data.customFields?.hiddenPlatformOptions)) setHiddenPlatformOptions(data.customFields.hiddenPlatformOptions);
                if (Array.isArray(data.customFields?.hiddenColorOptions)) setHiddenColorOptions(data.customFields.hiddenColorOptions);
                if (Array.isArray(data.customFields?.hiddenMaterialOptions)) setHiddenMaterialOptions(data.customFields.hiddenMaterialOptions);
                setShopSettings(normalizeShopSettings(data));
            }
        }, (error) => {
            console.error('Could not load shop settings:', error);
            setSettingsLoadError(error?.message || 'Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων Shop.');
        });
        return () => unsubscribe();
    }, [firebaseReady, currentUser]);

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        setSettingsSuccessMessage('');
        try {
            const settingsRef = doc(db, "settings", "shop");
            if (shopSettings.portfolioHeroVideoUrl && shopSettings.portfolioHeroVideoUrl.trim() && !portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)) {
                throw new Error('Εισάγετε έγκυρο σύνδεσμο http ή https για το βίντεο Hero του Portfolio.');
            }
            if (shopSettings.heroVideoUrl && shopSettings.heroVideoUrl.trim() && !portfolioHeroVideoUrl(shopSettings.heroVideoUrl)) {
                throw new Error('Εισάγετε έγκυρο σύνδεσμο http ή https για το βίντεο Hero του Shop.');
            }
            validatePortfolioDesign(normalizePortfolioDesign(shopSettings.portfolioDesign));
            const beforeSettings = (await getDoc(settingsRef)).data() || {};
            const ds = shopSettings.designStudio || DEFAULT_DESIGN_STUDIO;
            const savedSettings = {
                ...shopSettings,
                designStudio: ds,
                bgColor: ds.pageBackground || shopSettings.bgColor,
                textColor: ds.ink || shopSettings.textColor,
                primaryColor: ds.accent || shopSettings.primaryColor,
                fontFamily: ds.fontFamily || shopSettings.fontFamily,
                borderRadius: ds.cardRadius || shopSettings.borderRadius,
                heroTitleColor: ds.heroTitleInk || shopSettings.heroTitleColor,
                heroSubtitleColor: ds.heroBodyInk || shopSettings.heroSubtitleColor,
                customFields: { customCategories, customCollections, customStatuses, customMaterials, customPlatforms, customColors, statusOptionOrder, collectionOptionOrder, platformOptionOrder, colorOptionOrder, materialOptionOrder, hiddenCategoryOptions, hiddenStatusOptions, hiddenCollectionOptions, hiddenPlatformOptions, hiddenColorOptions, hiddenMaterialOptions }
            };
            await setDoc(settingsRef, savedSettings, { merge: true });
            pushVersionHistory({
                type: 'SETTINGS_UPDATE',
                id: 'settings/shop',
                name: 'Ρυθμίσεις Συστήματος',
                message: 'Επιτυχής ενημέρωση ρυθμίσεων συστήματος και εμφάνισης.',
                collection: 'settings',
                before: beforeSettings,
                after: { ...beforeSettings, ...savedSettings }
            });
            setSettingsSuccessMessage('Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς! Οι αλλαγές εφαρμόστηκαν άμεσα.');
            notifyOperationSuccess('Αποθήκευση Ρυθμίσεων', 'Οι ρυθμίσεις του καταστήματος αποθηκεύτηκαν επιτυχώς.');
            setTimeout(() => setSettingsSuccessMessage(''), 5000);
        } catch (err) {
            notifyOperationError('Σφάλμα Ρυθμίσεων', err.message || String(err));
            alert("Σφάλμα κατά την αποθήκευση των ρυθμίσεων: " + (err.message || err));
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleHeroVideoUpload = async (file, section = 'shop') => {
        if (!file || mediaPreparing) return;
        const isPortfolioHero = section === 'portfolio';
        const setStatus = isPortfolioHero ? setPortfolioHeroUploadStatus : setHeroUploadStatus;
        setMediaPreparing(true);
        setStatus('');
        setVideoProgress(null);
        try {
            const prepared = await prepareLocalVideo(file, { stripAudio: true });
            const validated = await validatePreparedMedia(prepared, 'video');
            setStatus('Ανέβασμα συμπιεσμένου βίντεο...');
            const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'hero-video.mp4';
            const fileRef = firebaseRef(storage, `jewelry/hero/${section}/${Date.now()}-${safeName}`);
            const task = uploadBytesResumable(fileRef, prepared, {
                contentType: validated.mime,
                cacheControl: 'public, max-age=31536000, immutable'
            });
            await new Promise<void>((resolve, reject) => task.on(
                'state_changed',
                (snapshot) => {
                    const pct = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
                    setStatus(`Ανέβασμα συμπιεσμένου βίντεο: ${pct}%`);
                    setVideoProgress({ text: `Ανέβασμα Hero στο Cloud... ${pct}%`, percent: pct });
                },
                reject,
                resolve
            ));
            let url;
            try {
                url = await getDownloadURL(task.snapshot.ref);
                await verifyStoredMedia(url, 'video');
            } catch (verificationError) {
                await deleteObject(task.snapshot.ref).catch(() => undefined);
                throw verificationError;
            }
            setVideoProgress({ text: 'Το βίντεο ανέβηκε επιτυχώς (100%).', percent: 100 });
            setShopSettings(prev => ({ ...prev, [isPortfolioHero ? 'portfolioHeroVideoUrl' : 'heroVideoUrl']: url }));
            setStatus(`Το βίντεο ανέβηκε. Πάτησε Αποθήκευση ρυθμίσεων για να εμφανιστεί στο ${isPortfolioHero ? 'Portfolio' : 'Shop'}.`);
            notifyOperationSuccess('Βίντεο Hero', `Το βίντεο ανέβηκε επιτυχώς για το ${isPortfolioHero ? 'Portfolio' : 'Shop'}.`);
        } catch (error) {
            setStatus(`Αποτυχία ανεβάσματος: ${error.message}`);
            notifyOperationError('Σφάλμα Ανεβάσματος Βίντεο', error.message);
        } finally { setMediaPreparing(false); }
    };

    const handleResetTheme = (mode) => {
        const base = mode === 'minimal' ? MINIMAL_SHOP_SETTINGS : DEFAULT_SHOP_SETTINGS;
        setShopSettings({
            ...base,
            portfolioHeroVideoUrl: shopSettings.portfolioHeroVideoUrl || '',
            portfolioDesign: shopSettings.portfolioDesign || DEFAULT_PORTFOLIO_DESIGN,
            categoryOrder: shopSettings.categoryOrder?.length ? shopSettings.categoryOrder : base.categoryOrder,
            fallbackLinks: { ...base.fallbackLinks, ...(shopSettings.fallbackLinks || {}) },
            aiAssistant: { ...base.aiAssistant, ...(shopSettings.aiAssistant || {}) },
            designStudio: shopSettings.designStudio || DEFAULT_DESIGN_STUDIO
        });
    };

    const updateAssistantSetting = (key, value) => {
        setShopSettings(prev => ({
            ...prev,
            aiAssistant: {
                ...DEFAULT_SHOP_SETTINGS.aiAssistant,
                ...(prev.aiAssistant || {}),
                [key]: value
            }
        }));
    };

    return {
        settingsLoadError, shopSettings, setShopSettings, heroUploadStatus, setHeroUploadStatus,
        portfolioHeroUploadStatus, setPortfolioHeroUploadStatus, isSavingSettings, activeSettingsTab,
        setActiveSettingsTab, settingsSuccessMessage, setSettingsSuccessMessage, activeFieldFilter,
        setActiveFieldFilter, draggedCategoryIdx, setDraggedCategoryIdx, isSettingsOpen, setIsSettingsOpen,
        handleSaveSettings, handleHeroVideoUpload, updateAssistantSetting
    };
}

export type ShopSettingsController = ReturnType<typeof useShopSettings>;
