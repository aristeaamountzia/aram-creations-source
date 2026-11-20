import { useState, useRef } from 'react';
import { editableBlob } from '../../lib/media-files';
import type { ProductWorkspace } from './useProductWorkspace';
import type { ProductMedia } from './useProductMedia';

type MediaStudioDependencies = Pick<
    ProductWorkspace,
    'currentItem' | 'formPrivateMediaList' | 'formShopMediaList' | 'setFormPrivateMediaList' |
    'setFormShopMediaList'
> &
    Pick<ProductMedia, 'refreshSmartSuggestionsFromMain'>;

/** Crop and adjust images while retaining their original files for restoration. */
export function useMediaStudio(dependencies: MediaStudioDependencies) {
    const {
        currentItem, formPrivateMediaList, formShopMediaList, refreshSmartSuggestionsFromMain,
        setFormPrivateMediaList, setFormShopMediaList
    } = dependencies;

    const [imageEditorTarget, setImageEditorTarget] = useState(null);
    const [imageEditorError, setImageEditorError] = useState('');
    const [imageEditorSettings, setImageEditorSettings] = useState({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
    const [imageEditorImageInfo, setImageEditorImageInfo] = useState({ width: 0, height: 0 });
    const [isApplyingImageEdit, setIsApplyingImageEdit] = useState(false);
    const imageEditorDragRef = useRef(null);

    const getImageEditorList = (scope) => scope === 'private' ? formPrivateMediaList : formShopMediaList;

    const imageEditorMedia = imageEditorTarget?.directMedia || (imageEditorTarget ? (getImageEditorList(imageEditorTarget.scope)?.[imageEditorTarget.index] || formShopMediaList?.[0] || formPrivateMediaList?.[0]) : null);

    const isAnimatedGifMedia = (media) => media?.fileObj?.type === 'image/gif' || /\.gif(?:$|[?#])/i.test(media?.url || '');

    const IMAGE_EDITOR_ASPECTS = {
        square: { label: '1:1', ratio: 1, width: 1400, height: 1400 },
        portrait: { label: '4:5', ratio: 4 / 5, width: 1120, height: 1400 },
        landscape: { label: '4:3', ratio: 4 / 3, width: 1400, height: 1050 }
    };

    const getImageEditorAspect = (key = imageEditorSettings.cropAspect) => IMAGE_EDITOR_ASPECTS[key] || IMAGE_EDITOR_ASPECTS.square;

    const clampImageEditorZoom = (value) => Math.max(1, Math.min(4, Number(value) || 1));

    const handleOpenImageEditor = (url?: string) => {
        const targetUrl = url || formShopMediaList?.[0]?.url || formPrivateMediaList?.[0]?.url || currentItem?.imageUrl || currentItem?.image || currentItem?.mediaList?.[0]?.url;
        if (!targetUrl) {
            alert('Δεν βρέθηκε εικόνα για επεξεργασία.');
            return;
        }
        const shopIndex = formShopMediaList?.findIndex(m => m.url === targetUrl);
        if (shopIndex !== undefined && shopIndex >= 0) {
            openImageEditor('shop', shopIndex);
            return;
        }
        const privIndex = formPrivateMediaList?.findIndex(m => m.url === targetUrl);
        if (privIndex !== undefined && privIndex >= 0) {
            openImageEditor('private', privIndex);
            return;
        }
        const newEntry = { url: targetUrl, type: 'image', showInShop: true, isNew: false };
        setFormShopMediaList(prev => (prev && prev.length > 0) ? [newEntry, ...prev] : [newEntry]);
        setImageEditorError('');
        setImageEditorTarget({ scope: 'shop', index: 0, directMedia: newEntry });
        setImageEditorImageInfo({ width: 0, height: 0 });
        setImageEditorSettings({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
    };

    const openImageEditor = (scope, index) => {
        const list = getImageEditorList(scope);
        const modalPreviewMedia = formShopMediaList?.[0]?.url || currentItem?.imageUrl || currentItem?.mediaList?.[0]?.url || formPrivateMediaList?.[0]?.url;
        const media = list?.[index] || formShopMediaList?.[0] || formPrivateMediaList?.[0] || (modalPreviewMedia ? { url: modalPreviewMedia, type: 'image', showInShop: true } : null);
        if (!media || media.type === 'video') return;
        if (isAnimatedGifMedia(media)) {
            alert('Τα GIF διατηρούν την κίνησή τους. Η επεξεργασία με crop ή φίλτρα θα τα μετέτρεπε σε στατική εικόνα, γι\' αυτό δεν εφαρμόζεται.');
            return;
        }
        setImageEditorError('');
        setImageEditorTarget({ scope, index: Math.max(0, index), directMedia: media });
        setImageEditorImageInfo({ width: 0, height: 0 });
        setImageEditorSettings({ rotate: 0, zoom: 1, panX: 0, panY: 0, brightness: 100, contrast: 100, cropAspect: 'square' });
    };

    const closeImageEditor = () => {
        if (isApplyingImageEdit) return;
        setImageEditorTarget(null);
    };

    const getImageEditorPanBounds = (settings = imageEditorSettings, info = imageEditorImageInfo) => {
        const aspect = getImageEditorAspect(settings.cropAspect);
        const rotate = ((settings.rotate % 360) + 360) % 360;
        const swap = rotate === 90 || rotate === 270;
        const width = Math.max(1, Number(info.width) || 1);
        const height = Math.max(1, Number(info.height) || 1);
        const imageRatio = swap ? height / width : width / height;
        const cropRatio = aspect.ratio;
        const baseWidth = imageRatio >= cropRatio ? imageRatio / cropRatio : 1;
        const baseHeight = imageRatio >= cropRatio ? 1 : cropRatio / imageRatio;
        const zoom = clampImageEditorZoom(settings.zoom);
        return {
            x: Math.max(0, (baseWidth * zoom - 1) * 50),
            y: Math.max(0, (baseHeight * zoom - 1) * 50)
        };
    };

    const clampImageEditorPan = (settings, info = imageEditorImageInfo) => {
        const bounds = getImageEditorPanBounds(settings, info);
        return {
            ...settings,
            zoom: clampImageEditorZoom(settings.zoom),
            panX: Math.max(-bounds.x, Math.min(bounds.x, Number(settings.panX) || 0)),
            panY: Math.max(-bounds.y, Math.min(bounds.y, Number(settings.panY) || 0))
        };
    };

    const getImageEditorPreviewStyle = () => {
        const aspect = getImageEditorAspect();
        const rotate = ((imageEditorSettings.rotate % 360) + 360) % 360;
        const swap = rotate === 90 || rotate === 270;
        const width = Math.max(1, Number(imageEditorImageInfo.width) || 1);
        const height = Math.max(1, Number(imageEditorImageInfo.height) || 1);
        const imageRatio = swap ? height / width : width / height;
        const cropRatio = aspect.ratio;
        const fillsWide = imageRatio >= cropRatio;
        const baseWidth = fillsWide ? `${(imageRatio / cropRatio) * 100}%` : '100%';
        const baseHeight = fillsWide ? '100%' : `${(cropRatio / imageRatio) * 100}%`;
        const clamped = clampImageEditorPan(imageEditorSettings);
        return {
            width: baseWidth,
            height: baseHeight,
            left: `calc(50% + ${clamped.panX}%)`,
            top: `calc(50% + ${clamped.panY}%)`,
            transform: `translate(-50%, -50%) rotate(${imageEditorSettings.rotate}deg) scale(${clamped.zoom})`,
            filter: `brightness(${imageEditorSettings.brightness}%) contrast(${imageEditorSettings.contrast}%)`,
            touchAction: 'none'
        };
    };

    const startImageEditorDrag = (event) => {
        if (isApplyingImageEdit) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        imageEditorDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX: imageEditorSettings.panX || 0,
            panY: imageEditorSettings.panY || 0
        };
    };

    const moveImageEditorDrag = (event) => {
        const drag = imageEditorDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const next = {
            ...imageEditorSettings,
            panX: drag.panX + ((event.clientX - drag.startX) / Math.max(rect.width, 1)) * 100,
            panY: drag.panY + ((event.clientY - drag.startY) / Math.max(rect.height, 1)) * 100
        };
        setImageEditorSettings(clampImageEditorPan(next));
    };

    const stopImageEditorDrag = (event) => {
        if (imageEditorDragRef.current?.pointerId === event.pointerId) {
            imageEditorDragRef.current = null;
        }
    };

    const loadEditableImage = async (media) => {
        const blob = await editableBlob(media);
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const nextImg = new Image();
                nextImg.referrerPolicy = 'no-referrer';
                nextImg.onload = () => resolve(nextImg);
                nextImg.onerror = () => reject(new Error('Το αρχείο δεν είναι έγκυρη στατική εικόνα.'));
                nextImg.src = url;
            });
            return { img, cleanup: () => URL.revokeObjectURL(url) };
        } catch (error) { URL.revokeObjectURL(url); throw error; }
    };

    const applyImageEditor = async () => {
        if (!imageEditorTarget || !imageEditorMedia || isApplyingImageEdit) return;
        setImageEditorError('');
        setIsApplyingImageEdit(true);
        let loadedImage = null;
        try {
            loadedImage = await loadEditableImage(imageEditorMedia);
            const img = loadedImage.img;
            const rotate = ((imageEditorSettings.rotate % 360) + 360) % 360;
            const swap = rotate === 90 || rotate === 270;
            const sourceWidth = img.naturalWidth || img.width;
            const sourceHeight = img.naturalHeight || img.height;
            const aspect = getImageEditorAspect(imageEditorSettings.cropAspect);
            const clampedSettings = clampImageEditorPan(imageEditorSettings, { width: sourceWidth, height: sourceHeight });
            const zoom = clampImageEditorZoom(clampedSettings.zoom);
            const rotatedWidth = swap ? sourceHeight : sourceWidth;
            const rotatedHeight = swap ? sourceWidth : sourceHeight;
            const canvas = document.createElement('canvas');
            canvas.width = aspect.width;
            canvas.height = aspect.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.filter = `brightness(${imageEditorSettings.brightness}%) contrast(${imageEditorSettings.contrast}%)`;
            ctx.translate(
                canvas.width / 2 + (canvas.width * (clampedSettings.panX || 0)) / 100,
                canvas.height / 2 + (canvas.height * (clampedSettings.panY || 0)) / 100
            );
            ctx.rotate((rotate * Math.PI) / 180);
            const coverScale = Math.max(canvas.width / rotatedWidth, canvas.height / rotatedHeight) * zoom;
            ctx.scale(coverScale, coverScale);
            ctx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);

            const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            if (!blob) throw new Error('Δεν μπόρεσα να αποθηκεύσω την επεξεργασμένη εικόνα.');
            const originalName = imageEditorMedia.fileObj?.name || imageEditorMedia.fileName || 'edited-image.jpg';
            const editedName = originalName.replace(/\.[^/.]+$/, '') + '-edited.jpg';
            const editedFile = new File([blob], editedName, { type: 'image/jpeg', lastModified: Date.now() });
            const editedUrl = URL.createObjectURL(editedFile);
            const updateList = (list) => {
                if (!list || list.length === 0) {
                    return [{
                        url: editedUrl,
                        type: 'image',
                        fileObj: editedFile,
                        fileName: editedName,
                        isNew: true,
                        edited: true,
                        originalUrl: imageEditorMedia.url
                    }];
                }
                return list.map((media, index) => {
                    if (index !== imageEditorTarget.index) return media;
                const restoreBackup = media.restoreBackup || (media.originalUrl ? {
                    url: media.originalUrl,
                    type: media.originalType || media.type || 'image',
                    fileObj: null,
                    fileName: media.originalFileName || originalName,
                    isNew: false
                } : {
                    url: media.url,
                    type: media.type || 'image',
                    fileObj: media.fileObj || null,
                    fileName: media.fileName || originalName,
                    isNew: Boolean(media.isNew)
                });
                if (media.restoreBackup && media.isNew && media.url?.startsWith('blob:')) URL.revokeObjectURL(media.url);
                return {
                    ...media,
                    url: editedUrl,
                    type: 'image',
                    fileObj: editedFile,
                    fileName: editedName,
                    isNew: true,
                    edited: true,
                    restoreBackup,
                    originalUrl: media.originalUrl || (!restoreBackup.isNew ? restoreBackup.url : ''),
                    originalType: media.originalType || restoreBackup.type || 'image',
                    originalFileName: media.originalFileName || restoreBackup.fileName || originalName
                };
            });

            };
            if (imageEditorTarget.scope === 'private') {
                const nextList = updateList(formPrivateMediaList);
                setFormPrivateMediaList(nextList);
                await refreshSmartSuggestionsFromMain(formShopMediaList, nextList);
            } else {
                const nextList = updateList(formShopMediaList);
                setFormShopMediaList(nextList);
                await refreshSmartSuggestionsFromMain(nextList, formPrivateMediaList);
            }
            setImageEditorTarget(null);
        } catch (err) {
            setImageEditorError(err.message || 'Σφάλμα επεξεργασίας εικόνας.');
        } finally {
            if (loadedImage?.cleanup) loadedImage.cleanup();
            setIsApplyingImageEdit(false);
        }
    };

    const canRestoreMediaOriginal = (media) => Boolean(media?.restoreBackup || media?.originalUrl);

    const handleRestoreEditedMedia = async (scope, index) => {
        const sourceList = getImageEditorList(scope);
        const media = sourceList[index];
        if (!canRestoreMediaOriginal(media)) return;
        const restoredFields = media.restoreBackup ? {
            url: media.restoreBackup.url,
            type: media.restoreBackup.type || 'image',
            fileObj: media.restoreBackup.fileObj || null,
            fileName: media.restoreBackup.fileName || media.fileName,
            isNew: Boolean(media.restoreBackup.isNew)
        } : {
            url: media.originalUrl,
            type: media.originalType || media.type || 'image',
            fileObj: null,
            fileName: media.originalFileName || media.fileName,
            isNew: false
        };
        const nextList = sourceList.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            if (item.isNew && item.url?.startsWith('blob:') && item.url !== restoredFields.url) URL.revokeObjectURL(item.url);
            const restored = {
                ...item,
                ...restoredFields,
                edited: false
            };
            delete restored.restoreBackup;
            delete restored.originalUrl;
            delete restored.originalType;
            delete restored.originalFileName;
            return restored;
        });

        if (scope === 'private') {
            setFormPrivateMediaList(nextList);
            await refreshSmartSuggestionsFromMain(formShopMediaList, nextList);
        } else {
            setFormShopMediaList(nextList);
            await refreshSmartSuggestionsFromMain(nextList, formPrivateMediaList);
        }
    };

    return {
        imageEditorTarget, imageEditorError, imageEditorSettings, setImageEditorSettings,
        setImageEditorImageInfo, isApplyingImageEdit, imageEditorMedia, isAnimatedGifMedia,
        IMAGE_EDITOR_ASPECTS, getImageEditorAspect, handleOpenImageEditor, openImageEditor, closeImageEditor,
        getImageEditorPanBounds, clampImageEditorPan, getImageEditorPreviewStyle, startImageEditorDrag,
        moveImageEditorDrag, stopImageEditorDrag, loadEditableImage, applyImageEditor, canRestoreMediaOriginal,
        handleRestoreEditedMedia
    };
}

export type MediaStudio = ReturnType<typeof useMediaStudio>;
