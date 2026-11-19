import { DEFAULT_SHOP_SETTINGS, mergeUnique } from './catalog-config';
import { stockForSelectedStatus } from '../../lib/stock-edit';
import { useState, useMemo } from 'react';
import { requestBackofficeAi } from '../../lib/backoffice-ai-client';
import { auth } from '../../firebase';
import type { CatalogOptions } from './useCatalogOptions';
import type { BackOfficeSharedState } from './backoffice-types';
import type { ProductWorkspace } from './useProductWorkspace';
import type { MediaStudio } from './useMediaStudio';
import type { ShopSettingsController } from './useShopSettings';

type ProductAiDependencies = Pick<
    CatalogOptions,
    'allAvailableColors' | 'allAvailableMaterials' | 'allAvailablePlatforms' | 'allCollections' |
    'allFormCategories' | 'allFormStatuses' | 'rememberCustomValues'
> &
    Pick<BackOfficeSharedState, 'currentUser'> &
    Pick<
    ProductWorkspace,
    'formCategory' | 'formColorsArr' | 'formCost' | 'formDate' | 'formDimensions' | 'formMaterials' |
    'formName' | 'formNotes' | 'formPostedPlatforms' | 'formPrice' | 'formPrivateMediaList' |
    'formPurchaseLinks' | 'formShopMediaList' | 'formStatus' | 'formStock' | 'formStorage' | 'formWeight' |
    'setFormCategory' | 'setFormCollection' | 'setFormColorsArr' | 'setFormMaterials' | 'setFormName' |
    'setFormNotes' | 'setFormStatus' | 'setFormStock' | 'setIsCustomCategory' | 'setIsCustomCollection' |
    'setIsCustomStatus'
> &
    Pick<MediaStudio, 'loadEditableImage'> &
    Pick<ShopSettingsController, 'setActiveSettingsTab' | 'setIsSettingsOpen' | 'shopSettings'>;

export function useProductAi(dependencies: ProductAiDependencies) {
    const {
        allAvailableColors, allAvailableMaterials, allAvailablePlatforms, allCollections, allFormCategories,
        allFormStatuses, currentUser, formCategory, formColorsArr, formCost, formDate, formDimensions,
        formMaterials, formName, formNotes, formPostedPlatforms, formPrice, formPrivateMediaList,
        formPurchaseLinks, formShopMediaList, formStatus, formStock, formStorage, formWeight,
        loadEditableImage, rememberCustomValues, setActiveSettingsTab, setFormCategory, setFormCollection,
        setFormColorsArr, setFormMaterials, setFormName, setFormNotes, setFormStatus, setFormStock,
        setIsCustomCategory, setIsCustomCollection, setIsCustomStatus, setIsSettingsOpen, shopSettings
    } = dependencies;

    const [aiProductPrompt, setAiProductPrompt] = useState('');
    const [aiProductDraft, setAiProductDraft] = useState(null);
    const [isAiProductWorking, setIsAiProductWorking] = useState(false);
    const [aiProductError, setAiProductError] = useState('');
    const [aiAccessCode, setAiAccessCode] = useState(() => {
        try {
            return sessionStorage.getItem('aram_backoffice_ai_secret') || '';
        } catch (err) {
            return '';
        }
    });

    const [showAiAccessCode, setShowAiAccessCode] = useState(false);

    const assistantSettings = useMemo(() => ({
        ...DEFAULT_SHOP_SETTINGS.aiAssistant,
        ...(shopSettings.aiAssistant || {})
    }), [shopSettings.aiAssistant]);

    const getBackofficeAiEndpoint = () => {
        const configuredEndpoint = (assistantSettings.backofficeEndpoint || '').trim();
        const isHostedAdmin = window.location.protocol !== 'file:';
        const isLocalEndpoint = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(configuredEndpoint);
        if (isHostedAdmin && (!configuredEndpoint || isLocalEndpoint)) {
            return '/api/backoffice-ai';
        }
        return configuredEndpoint;
    };

    const handleAiAccessCodeChange = (value) => {
        setAiAccessCode(value);
        try {
            if (value) sessionStorage.setItem('aram_backoffice_ai_secret', value);
            else sessionStorage.removeItem('aram_backoffice_ai_secret');
        } catch (err) {}
    };

    const getAiImageMediaCandidates = () => ([
        ...formPrivateMediaList.map(media => ({ ...media, aiSource: 'back-office-only' })),
        ...formShopMediaList.map(media => ({ ...media, aiSource: 'shop' }))
    ]).filter(media => media.type !== 'video' && media.url);

    const getFormProductPayload = () => {
        const imageMedia = getAiImageMediaCandidates();
        const mainMedia = imageMedia[0] || null;
        return {
            name: formName,
            category: formCategory,
            collection: '',
            status: formStatus,
            creationDate: formDate,
            price: formPrice,
            cost: formCost,
            stock: formStock,
            weight: formWeight,
            dimensions: formDimensions,
            storage: formStorage,
            materials: formMaterials,
            colors: formColorsArr,
            notes: formNotes,
            purchaseLinks: formPurchaseLinks,
            postedPlatforms: formPostedPlatforms,
            mainImageName: mainMedia?.fileObj?.name || mainMedia?.fileName || '',
            privateImageNames: formPrivateMediaList
                .filter(media => media.type !== 'video')
                .map(media => media.fileObj?.name || media.fileName || '')
                .filter(Boolean),
            hasImage: Boolean(mainMedia?.url),
            privateImageCount: formPrivateMediaList.filter(media => media.type !== 'video').length
        };
    };

    const mediaToAiImageDataUrl = async (media) => {
        if (!media?.url) return '';
        let loaded = null;
        try {
            loaded = await loadEditableImage(media);
            const img = loaded.img;
            const canvas = document.createElement('canvas');
            const ratio = Math.min(768 / img.width, 768 / img.height, 1);
            canvas.width = Math.max(Math.round(img.width * ratio), 1);
            canvas.height = Math.max(Math.round(img.height * ratio), 1);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            return canvas.toDataURL('image/jpeg', 0.78);
        } catch { return ''; }
        finally { loaded?.cleanup?.(); }
    };

    const getAiImageDataUrls = async () => {
        const mediaItems = getAiImageMediaCandidates().slice(0, 3);
        const dataUrls = await Promise.all(mediaItems.map(mediaToAiImageDataUrl));
        return dataUrls.filter(Boolean);
    };

    const getAiImageDataUrl = async () => {
        const dataUrls = await getAiImageDataUrls();
        return dataUrls[0] || '';
    };

    const normalizeAiList = (value) => {
        if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
        if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
        return [];
    };

    const normalizeAiDraft = (data: Record<string, any> = {}) => {
        const suggestion = data.suggestion || data.product || data;
        return {
            title: suggestion.title || suggestion.name || '',
            description: suggestion.description || suggestion.notes || '',
            shortDescription: suggestion.shortDescription || '',
            category: suggestion.category || '',
            collection: '',
            colors: normalizeAiList(suggestion.colors),
            materials: normalizeAiList(suggestion.materials),
            tags: normalizeAiList(suggestion.tags || suggestion.seoKeywords),
            instagramCaption: suggestion.instagramCaption || '',
            altText: suggestion.altText || '',
            raw: suggestion
        };
    };

    const handleBackofficeAiGenerate = async (task = 'full') => {
        const endpoint = getBackofficeAiEndpoint();
        if (!endpoint) {
            setAiProductError('Προσθέστε πρώτα Back-office AI endpoint στις ρυθμίσεις AI.');
            setIsSettingsOpen(true);
            setActiveSettingsTab('assistant');
            return;
        }

        setIsAiProductWorking(true);
        setAiProductError('');
        try {
            const imageDataUrls = await getAiImageDataUrls();
            const imageDataUrl = imageDataUrls[0] || '';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const signedInUser = currentUser || auth?.currentUser || null;
            if (signedInUser?.getIdToken) headers.Authorization = `Bearer ${await signedInUser.getIdToken()}`;
            if (aiAccessCode.trim()) headers['X-Aram-AI-Secret'] = aiAccessCode.trim();
            const data = await requestBackofficeAi({
                    mode: 'backoffice_product',
                    task,
                    language: 'el',
                    prompt: aiProductPrompt,
                    product: getFormProductPayload(),
                    options: {
                        categories: allFormCategories,
                        statuses: allFormStatuses,
                        materials: allAvailableMaterials,
                        colors: allAvailableColors,
                        platforms: allAvailablePlatforms
                    },
                    imageDataUrl,
                    imageDataUrls
            }, headers, endpoint);
            setAiProductDraft(normalizeAiDraft(data));
        } catch (err) {
            setAiProductError(err.message || 'Αποτυχία AI πρότασης.');
        } finally {
            setIsAiProductWorking(false);
        }
    };

    const applyAiCategory = (value) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return;
        setFormCategory(trimmed);
        setIsCustomCategory(!allFormCategories.includes(trimmed));
    };

    const applyAiCollection = (value) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return;
        setFormCollection(trimmed);
        setIsCustomCollection(Boolean(trimmed) && !allCollections.includes(trimmed));
    };

    const applyAiProductDraft = (fillOnly = false) => {
        if (!aiProductDraft) return;
        if (aiProductDraft.title && (!fillOnly || !formName.trim())) setFormName(aiProductDraft.title);
        if (aiProductDraft.description && (!fillOnly || !formNotes.trim())) setFormNotes(aiProductDraft.description);
        if (aiProductDraft.category && (!fillOnly || !formCategory.trim())) applyAiCategory(aiProductDraft.category);
        if (aiProductDraft.colors.length && (!fillOnly || formColorsArr.length === 0)) {
            const nextColors = fillOnly ? aiProductDraft.colors : mergeUnique(formColorsArr, aiProductDraft.colors);
            setFormColorsArr(nextColors.slice(0, 8));
            rememberCustomValues({ colors: nextColors });
        }
        if (aiProductDraft.materials.length && (!fillOnly || formMaterials.length === 0)) {
            const nextMaterials = fillOnly ? aiProductDraft.materials : mergeUnique(formMaterials, aiProductDraft.materials);
            setFormMaterials(nextMaterials.slice(0, 8));
            rememberCustomValues({ materials: nextMaterials });
        }
    };

    return {
        aiProductPrompt, setAiProductPrompt, aiProductDraft, isAiProductWorking, aiProductError, aiAccessCode,
        showAiAccessCode, setShowAiAccessCode, assistantSettings, getBackofficeAiEndpoint,
        handleAiAccessCodeChange, handleBackofficeAiGenerate, applyAiProductDraft
    };
}

export type ProductAi = ReturnType<typeof useProductAi>;
