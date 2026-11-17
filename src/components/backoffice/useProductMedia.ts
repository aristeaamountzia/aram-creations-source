import { mergeUnique, normalizeForMatch, CATEGORY_KEYWORD_HINTS } from './catalog-config';
import { useState, useEffect } from 'react';
import { notifyOperationError } from '../../lib/sound-notifications';
import { editableBlob } from '../../lib/media-files';
import type { CatalogOptions } from './useCatalogOptions';
import type { ProductWorkspace } from './useProductWorkspace';
import type { BackOfficeUploads } from './useBackOfficeUploads';

interface SmartImageSuggestions {
    colors: string[];
    category: string;
    source: string;
    imageHints?: string[];
    description?: string;
}

type ProductMediaDependencies = Pick<CatalogOptions, 'allAvailableColors' | 'allFormCategories' | 'rememberCustomValues'> &
    Pick<
    ProductWorkspace,
    'formCategory' | 'formColorsArr' | 'formMaterials' | 'formName' | 'formNotes' | 'formPrivateMediaList' |
    'formShopMediaList' | 'isEditMode' | 'newColorInput' | 'newMaterialInput' | 'prepareEditorMediaFiles' |
    'setFormPrivateMediaList' | 'setFormShopMediaList'
> &
    Pick<BackOfficeUploads, 'mediaPreparing' | 'setMediaPreparing' | 'setUploadStatus' | 'setVideoProgress'>;

export function useProductMedia(dependencies: ProductMediaDependencies) {
    const {
        allAvailableColors, allFormCategories, formCategory, formColorsArr, formMaterials, formName, formNotes,
        formPrivateMediaList, formShopMediaList, isEditMode, mediaPreparing, newColorInput, newMaterialInput,
        prepareEditorMediaFiles, rememberCustomValues, setFormPrivateMediaList, setFormShopMediaList,
        setMediaPreparing, setUploadStatus, setVideoProgress
    } = dependencies;

    const [smartSuggestions, setSmartSuggestions] = useState<SmartImageSuggestions | null>(null);

    const getSmartSignalText = (fileName = '') => {
        return [
            formName,
            formNotes,
            newMaterialInput,
            newColorInput,
            fileName
        ].filter(Boolean).join(' ');
    };

    const getCategoryMatchRules = () => {
        return allFormCategories.map(category => {
            const normalizedCategory = normalizeForMatch(category);
            const directWords = normalizedCategory.split(' ').filter(word => word.length > 2);
            const matchingHint = Object.entries(CATEGORY_KEYWORD_HINTS).find(([baseCategory]) => {
                const normalizedBase = normalizeForMatch(baseCategory);
                const baseWords = normalizedBase.split(' ').filter(word => word.length > 3);
                const categoryWords = normalizedCategory.split(' ').filter(word => word.length > 3);
                return normalizedCategory.includes(normalizedBase) ||
                    normalizedBase.includes(normalizedCategory) ||
                    baseWords.some(baseWord => categoryWords.some(categoryWord => categoryWord.includes(baseWord) || baseWord.includes(categoryWord)));
            });
            const hintWords = matchingHint ? matchingHint[1].map(normalizeForMatch) : [];
            return {
                category,
                words: Array.from(new Set([normalizedCategory, ...directWords, ...hintWords].filter(word => word.length > 2)))
            };
        });
    };

    const findCategoryByHints = (hints, rules) => {
        for (const hint of hints) {
            const normalizedHint = normalizeForMatch(hint);
            const match = rules.find(rule => {
                const normalizedCategory = normalizeForMatch(rule.category);
                return normalizedCategory.includes(normalizedHint) || rule.words.some(word => word.includes(normalizedHint) || normalizedHint.includes(word));
            });
            if (match) return match.category;
        }
        return '';
    };

    const detectCategoryFromSignals = (text, imageHints = []) => {
        const normalizedText = normalizeForMatch(text);
        const rules = getCategoryMatchRules();
        const textMatch = rules.find(rule => rule.words.some(word => normalizedText.includes(word)));
        if (textMatch) return textMatch.category;
        return findCategoryByHints(imageHints, rules);
    };

    const detectColorsFromSignals = (text) => {
        const normalizedText = normalizeForMatch(text);
        return allAvailableColors.filter(color => {
            const normalizedColor = normalizeForMatch(color);
            return normalizedColor.length > 2 && normalizedText.includes(normalizedColor);
        }).slice(0, 4);
    };

    const buildSmartDescription = (suggestions: Partial<SmartImageSuggestions> = {}) => {
        const colors = mergeUnique(formColorsArr, suggestions.colors || []).slice(0, 3);
        const materials = formMaterials.slice(0, 3);
        const materialText = materials.length ? materials.join(', ').toLowerCase() : 'επιλεγμένα υλικά';
        const colorText = colors.length ? colors.join(', ').toLowerCase() : 'φυσικές αποχρώσεις';
        return `Χειροποίητη δημιουργία από ${materialText} σε αποχρώσεις του ${colorText}. Κάθε κομμάτι είναι φτιαγμένο εξ ολοκλήρου στο χέρι και είναι μοναδικό.`;
    };

    const extractImageCategoryHints = (data, size) => {
        const corners = [
            [0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]
        ];
        const bg = corners.reduce((acc, [x, y]) => {
            const idx = (y * size + x) * 4;
            return [acc[0] + data[idx], acc[1] + data[idx + 1], acc[2] + data[idx + 2]];
        }, [0, 0, 0]).map(value => value / corners.length);
        let minX = size, minY = size, maxX = 0, maxY = 0, total = 0, left = 0, right = 0, center = 0;

        for (let y = 0; y < size; y += 2) {
            for (let x = 0; x < size; x += 2) {
                const idx = (y * size + x) * 4;
                if (data[idx + 3] < 120) continue;
                const distance = Math.abs(data[idx] - bg[0]) + Math.abs(data[idx + 1] - bg[1]) + Math.abs(data[idx + 2] - bg[2]);
                if (distance < 45) continue;
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                total += 1;
                if (x < size * 0.38) left += 1;
                else if (x > size * 0.62) right += 1;
                else center += 1;
            }
        }

        if (total < 35) return [];
        const width = Math.max(maxX - minX + 1, 1);
        const height = Math.max(maxY - minY + 1, 1);
        const aspect = height / width;
        const fillRatio = total / ((width / 2) * (height / 2));
        const hasTwoSideClusters = left > total * 0.25 && right > total * 0.25 && center < total * 0.28;
        const hints = [];

        if (hasTwoSideClusters) hints.push('Σκουλαρίκια');
        if (aspect > 1.35 && fillRatio > 0.45) hints.push('Θήκες Κινητών');
        if (aspect > 1.18 && fillRatio <= 0.45) hints.push('Κολιέ');
        if (aspect < 0.78) hints.push('Βραχιόλια');
        if (aspect >= 0.78 && aspect <= 1.18 && fillRatio < 0.45) hints.push('Δαχτυλίδια');

        return hints;
    };

    const colorNameFromRgb = (r, g, b) => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (max > 232 && delta < 28) return 'Λευκό';
        if (max < 45) return 'Μαύρο';
        if (delta < 24) return 'Ασημί';
        let hue = 0;
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
        if (r > 190 && g > 130 && b < 85) return 'Χρυσό';
        if (hue < 18 || hue >= 340) return 'Κόκκινο';
        if (hue < 45) return 'Κίτρινο';
        if (hue < 78) return 'Χρυσό';
        if (hue < 165) return 'Πράσινο';
        if (hue < 245) return 'Μπλε';
        if (hue < 292) return 'Μωβ';
        return 'Ροζ';
    };

    const analyzeImageForSmartTags = async (previewUrl, fileName = '') => {
        let temporaryUrl = '';
        if (/^https:/i.test(previewUrl)) {
            try { temporaryUrl = URL.createObjectURL(await editableBlob({ url: previewUrl })); previewUrl = temporaryUrl; }
            catch { return { colors: detectColorsFromSignals(getSmartSignalText(fileName)), category: detectCategoryFromSignals(getSmartSignalText(fileName)), source: fileName }; }
        }
        return new Promise<SmartImageSuggestions>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
                try {
                    const canvas = document.createElement('canvas');
                    const size = 80;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, size, size);
                    const data = ctx.getImageData(0, 0, size, size).data;
                    const counts: Record<string, number> = {};
                    for (let i = 0; i < data.length; i += 16) {
                        const alpha = data[i + 3];
                        if (alpha < 120) continue;
                        const name = colorNameFromRgb(data[i], data[i + 1], data[i + 2]);
                        counts[name] = (counts[name] || 0) + 1;
                    }
                    const imageColors = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([name]) => name);
                    const imageHints = extractImageCategoryHints(data, size);
                    const category = detectCategoryFromSignals(getSmartSignalText(fileName), imageHints);
                    const colors = mergeUnique(detectColorsFromSignals(getSmartSignalText(fileName)), imageColors);
                    resolve({ colors, category, source: fileName || 'κύρια εικόνα', imageHints });
                } catch (err) {
                    resolve({
                        colors: detectColorsFromSignals(getSmartSignalText(fileName)),
                        category: detectCategoryFromSignals(getSmartSignalText(fileName)),
                        source: fileName || 'κύρια εικόνα',
                        imageHints: []
                    });
                }
            };
            img.onerror = () => { if (temporaryUrl) URL.revokeObjectURL(temporaryUrl); resolve({ colors: detectColorsFromSignals(getSmartSignalText(fileName)), category: detectCategoryFromSignals(getSmartSignalText(fileName)), source: fileName || 'κύρια εικόνα', imageHints: [] }); };
            img.src = previewUrl;
        });
    };

    const refreshSmartSuggestionsFromMain = async (shopMediaList = formShopMediaList, privateMediaList = formPrivateMediaList) => {
        const mainMedia = [
            ...privateMediaList.map(media => ({ ...media, smartSource: 'back-office file' })),
            ...shopMediaList.map(media => ({ ...media, smartSource: 'shop image' }))
        ].find(media => media.type !== 'video' && media.url);
        if (!mainMedia?.url) {
            const fallbackSuggestions = {
                colors: detectColorsFromSignals(getSmartSignalText('')),
                category: detectCategoryFromSignals(getSmartSignalText('')),
                source: 'στοιχεία φόρμας',
                imageHints: []
            };
            setSmartSuggestions({
                ...fallbackSuggestions,
                description: buildSmartDescription(fallbackSuggestions)
            });
            return fallbackSuggestions;
        }
        const fileName = mainMedia.fileObj?.name || mainMedia.fileName || mainMedia.smartSource || 'κύρια εικόνα';
        const suggestions = await analyzeImageForSmartTags(mainMedia.url, fileName);
        const nextSuggestions = {
            ...suggestions,
            description: buildSmartDescription(suggestions)
        };
        setSmartSuggestions(nextSuggestions);
        return nextSuggestions;
    };

    const handleRefreshSmartSuggestions = async () => {
        rememberCustomValues({ category: formCategory, colors: formColorsArr, materials: formMaterials });
        await refreshSmartSuggestionsFromMain(formShopMediaList, formPrivateMediaList);
    };

    useEffect(() => {
        if (!smartSuggestions) return;
        const nextCategory = detectCategoryFromSignals(getSmartSignalText(smartSuggestions.source), smartSuggestions.imageHints || []);
        const nextColors = mergeUnique(smartSuggestions.colors || [], detectColorsFromSignals(getSmartSignalText(smartSuggestions.source)));
        const nextDescription = buildSmartDescription({ ...smartSuggestions, category: nextCategory, colors: nextColors });
        if (nextCategory !== smartSuggestions.category || nextColors.join('|') !== (smartSuggestions.colors || []).join('|') || nextDescription !== smartSuggestions.description) {
            setSmartSuggestions(prev => prev ? {
                ...prev,
                category: nextCategory,
                colors: nextColors,
                description: nextDescription
            } : prev);
        }
    }, [formName, formNotes, formCategory, formColorsArr, formMaterials, newMaterialInput, newColorInput, allFormCategories, allAvailableColors, smartSuggestions?.source]);

    const handleFileSelectShop = async (files) => {
        if (mediaPreparing) return;
        setMediaPreparing(true); setVideoProgress(null);
        setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
        try {
        const { items: newMedia, errors } = await prepareEditorMediaFiles(files, true);
        const smartCandidate = !isEditMode && formShopMediaList.length === 0 && newMedia[0]?.type === 'image'
            ? newMedia[0]
            : null;
        setFormShopMediaList(prev => [...prev, ...newMedia]);
        if (smartCandidate) {
            setUploadStatus('Ανάλυση κύριας εικόνας...');
            const suggestions = await analyzeImageForSmartTags(smartCandidate.url, smartCandidate.fileName);
            if (suggestions.colors.length || suggestions.category) {
                setSmartSuggestions({
                    ...suggestions,
                    description: buildSmartDescription(suggestions)
                });
            }
        }
        if (errors.length) {
            setVideoProgress({ text: errors.join('\n') });
            notifyOperationError('Σφάλμα αρχείων', errors.join('\n'));
        }
        } catch (error) {
            const message = error.message || 'Αποτυχία προετοιμασίας αρχείων.';
            setVideoProgress({ text: message });
            notifyOperationError('Σφάλμα αρχείων', message);
        } finally { setUploadStatus(''); setMediaPreparing(false); }
    };

    const handleRemoveShopMedia = (idx) => {
        if (formShopMediaList[idx].isNew) URL.revokeObjectURL(formShopMediaList[idx].url);
        const nextList = formShopMediaList.filter((_, i) => i !== idx);
        setFormShopMediaList(nextList);
        if (idx === 0) refreshSmartSuggestionsFromMain(nextList);
    };

    const handleFileSelectPrivate = async (files) => {
        if (mediaPreparing) return;
        setMediaPreparing(true); setVideoProgress(null);
        setUploadStatus('Επεξεργασία και συμπίεση αρχείων...');
        try {
        const { items: newMedia, errors } = await prepareEditorMediaFiles(files, false);
        const smartCandidate = newMedia.find(media => media.type === 'image');
        const nextPrivateMediaList = [...formPrivateMediaList, ...newMedia];
        setFormPrivateMediaList(nextPrivateMediaList);
        if (smartCandidate) {
            setUploadStatus('Ανάλυση εικόνας back-office...');
            await refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
        }
        if (errors.length) {
            setVideoProgress({ text: errors.join('\n') });
            notifyOperationError('Σφάλμα αρχείων', errors.join('\n'));
        }
        } catch (error) {
            const message = error.message || 'Αποτυχία προετοιμασίας αρχείων.';
            setVideoProgress({ text: message });
            notifyOperationError('Σφάλμα αρχείων', message);
        } finally { setUploadStatus(''); setMediaPreparing(false); }
    };

    const handleRemovePrivateMedia = (idx) => {
        if (formPrivateMediaList[idx].isNew) URL.revokeObjectURL(formPrivateMediaList[idx].url);
        const nextPrivateMediaList = formPrivateMediaList.filter((_, i) => i !== idx);
        setFormPrivateMediaList(nextPrivateMediaList);
        refreshSmartSuggestionsFromMain(formShopMediaList, nextPrivateMediaList);
    };

    return {
        smartSuggestions, setSmartSuggestions, refreshSmartSuggestionsFromMain, handleRefreshSmartSuggestions,
        handleFileSelectShop, handleRemoveShopMedia, handleFileSelectPrivate, handleRemovePrivateMedia
    };
}

export type ProductMedia = ReturnType<typeof useProductMedia>;
