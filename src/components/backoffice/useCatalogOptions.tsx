import { catalogColorSwatch, catalogLabelCounts, catalogLabelKey, colorKey, materialKey, uniqueCatalogLabels } from '../../lib/catalog-labels';
import { inventoryLabel } from '../../lib/stock-edit';
import { IconTrash, IconGripVertical } from './icons';
import {
    BASE_CATEGORIES, BASE_STATUSES, BASE_MATERIALS, BASE_PLATFORMS, BASE_COLORS,
    DEFAULT_SHOP_SETTINGS, normalizeForMatch
} from './catalog-config';
import { useMemo } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { CatalogPreferences } from './useCatalogPreferences';
import type { ProductWorkspace } from './useProductWorkspace';
import type { BackOfficeSharedState } from './backoffice-types';
import type { ShopSettingsController } from './useShopSettings';

type CatalogOptionsDependencies = Pick<
    CatalogPreferences,
    'collectionOptionOrder' | 'colorOptionOrder' | 'customCategories' | 'customCollections' | 'customColors' |
    'customMaterials' | 'customPlatforms' | 'customStatuses' | 'draggedFieldOption' | 'hiddenCategoryOptions' |
    'hiddenCollectionOptions' | 'hiddenColorOptions' | 'hiddenMaterialOptions' | 'hiddenPlatformOptions' |
    'hiddenStatusOptions' | 'materialOptionOrder' | 'platformOptionOrder' | 'setCollectionOptionOrder' |
    'setColorOptionOrder' | 'setCustomCategories' | 'setCustomCollections' | 'setCustomColors' |
    'setCustomMaterials' | 'setCustomPlatforms' | 'setCustomStatuses' | 'setDraggedFieldOption' |
    'setHiddenCategoryOptions' | 'setHiddenCollectionOptions' | 'setHiddenColorOptions' |
    'setHiddenMaterialOptions' | 'setHiddenPlatformOptions' | 'setHiddenStatusOptions' |
    'setMaterialOptionOrder' | 'setPlatformOptionOrder' | 'setStatusOptionOrder' | 'statusOptionOrder'
> &
    Pick<
    ProductWorkspace,
    'currentItem' | 'formCategory' | 'formCollection' | 'formColorsArr' | 'formMaterials' | 'formName' |
    'formPostedPlatforms' | 'formPurchaseLinks' | 'formStatus' | 'isEditMode' | 'newPostedSite' |
    'newPostedUrl' | 'newPostedVisible' | 'newPurchaseSite' | 'newPurchaseUrl' | 'setFormCategory' |
    'setFormCollection' | 'setFormColorsArr' | 'setFormMaterials' | 'setFormPostedPlatforms' |
    'setFormPurchaseLinks' | 'setFormStatus' | 'setIsCustomPostedSite' | 'setIsCustomPurchaseSite' |
    'setNewColorInput' | 'setNewMaterialInput' | 'setNewPostedSite' | 'setNewPostedUrl' |
    'setNewPostedVisible' | 'setNewPurchaseSite' | 'setNewPurchaseUrl'
> &
    Pick<BackOfficeSharedState, 'firebaseReady' | 'jewelryList'> &
    Pick<ShopSettingsController, 'setShopSettings' | 'shopSettings'>;

export function useCatalogOptions(dependencies: CatalogOptionsDependencies) {
    const {
        collectionOptionOrder, colorOptionOrder, currentItem, customCategories, customCollections,
        customColors, customMaterials, customPlatforms, customStatuses, draggedFieldOption, firebaseReady,
        formCategory, formCollection, formColorsArr, formMaterials, formName, formPostedPlatforms,
        formPurchaseLinks, formStatus, hiddenCategoryOptions, hiddenCollectionOptions, hiddenColorOptions,
        hiddenMaterialOptions, hiddenPlatformOptions, hiddenStatusOptions, isEditMode, jewelryList,
        materialOptionOrder, newPostedSite, newPostedUrl, newPostedVisible, newPurchaseSite, newPurchaseUrl,
        platformOptionOrder, setCollectionOptionOrder, setColorOptionOrder, setCustomCategories,
        setCustomCollections, setCustomColors, setCustomMaterials, setCustomPlatforms, setCustomStatuses,
        setDraggedFieldOption, setFormCategory, setFormCollection, setFormColorsArr, setFormMaterials,
        setFormPostedPlatforms, setFormPurchaseLinks, setFormStatus, setHiddenCategoryOptions,
        setHiddenCollectionOptions, setHiddenColorOptions, setHiddenMaterialOptions, setHiddenPlatformOptions,
        setHiddenStatusOptions, setIsCustomPostedSite, setIsCustomPurchaseSite, setMaterialOptionOrder,
        setNewColorInput, setNewMaterialInput, setNewPostedSite, setNewPostedUrl, setNewPostedVisible,
        setNewPurchaseSite, setNewPurchaseUrl, setPlatformOptionOrder, setShopSettings, setStatusOptionOrder,
        shopSettings, statusOptionOrder
    } = dependencies;

    const getStatusColor = (status) => {
        if (status === 'Διαθέσιμο') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        if (status === 'Πουλήθηκε') return 'bg-rose-100 text-rose-700 border border-rose-200';
        if (status === 'Υπό Κατασκευή') return 'bg-amber-100 text-amber-700 border border-amber-200';
        if (status === 'Δωρίστηκε') return 'bg-blue-100 text-blue-700 border border-blue-200';
        return 'bg-stone-100 text-stone-600 border border-stone-200';
    };

    const countValues = (values = []) => values.reduce((acc, value) => {
        if (value) acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const orderOptions = (options, order) => {
        return [...options].sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b, 'el');
        });
    };

    const sortByUsage = (options, counts, order) => {
        return [...options].sort((a, b) => {
            const countDiff = (counts[b] || 0) - (counts[a] || 0);
            if (countDiff !== 0) return countDiff;
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b, 'el');
        });
    };

    const statusUsageCounts = useMemo(() => countValues(jewelryList.map(inventoryLabel)), [jewelryList]);

    const platformUsageCounts = useMemo(() => {
        return countValues(jewelryList.flatMap(item => [
            ...(item.purchaseLinks || item.productLinks || []).map(link => link.site),
            ...(item.postedPlatforms || []).map(platform => platform.site),
            ...(item.platforms || [])
        ]));
    }, [jewelryList]);

    const settingsCategoryOptions = useMemo(() => {
        const embedded = jewelryList.map(item => item.category);
        const order = shopSettings.categoryOrder || [];
        return orderOptions(uniqueCatalogLabels([...BASE_CATEGORIES, ...customCategories, ...order, ...embedded].filter(cat => cat && !hiddenCategoryOptions.some(hidden => catalogLabelKey(hidden) === catalogLabelKey(cat)))), order);
    }, [jewelryList, customCategories, hiddenCategoryOptions, shopSettings.categoryOrder]);

    const categoryUsageCounts = useMemo(() => catalogLabelCounts(
        jewelryList.map(item => item.category), settingsCategoryOptions
    ), [jewelryList, settingsCategoryOptions]);

    const allFormCategories = useMemo(() => sortByUsage(
        settingsCategoryOptions, categoryUsageCounts, shopSettings.categoryOrder || []
    ), [settingsCategoryOptions, categoryUsageCounts, shopSettings.categoryOrder]);

    const allFilterCategories = useMemo(() => {
        const embedded = jewelryList.map(item => item.category);
        const order = shopSettings.categoryOrder || [];
        return uniqueCatalogLabels([...order, ...embedded])
            .sort((a, b) => {
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b, 'el');
            });
    }, [jewelryList, shopSettings.categoryOrder]);

    const allFormStatuses = useMemo(() => {
        const embedded = jewelryList.map(inventoryLabel);
        return sortByUsage(Array.from(new Set([...BASE_STATUSES, ...customStatuses, ...embedded])).filter(status => status && !hiddenStatusOptions.includes(status)), statusUsageCounts, statusOptionOrder.length ? statusOptionOrder : BASE_STATUSES);
    }, [jewelryList, customStatuses, hiddenStatusOptions, statusUsageCounts, statusOptionOrder]);

    const settingsStatusOptions = useMemo(() => {
        const embedded = jewelryList.map(inventoryLabel);
        return orderOptions(Array.from(new Set([...BASE_STATUSES, ...customStatuses, ...embedded])).filter(status => status && !hiddenStatusOptions.includes(status)), statusOptionOrder.length ? statusOptionOrder : BASE_STATUSES);
    }, [jewelryList, customStatuses, hiddenStatusOptions, statusOptionOrder]);

    const settingsCollectionOptions = useMemo(() => {
        const embedded = jewelryList.map(item => item.collection);
        return orderOptions(uniqueCatalogLabels([...customCollections, ...embedded].filter(collection => collection && !hiddenCollectionOptions.some(hidden => catalogLabelKey(hidden) === catalogLabelKey(collection)))), collectionOptionOrder);
    }, [jewelryList, customCollections, hiddenCollectionOptions, collectionOptionOrder]);

    const collectionUsageCounts = useMemo(() => catalogLabelCounts(
        jewelryList.map(item => item.collection), settingsCollectionOptions
    ), [jewelryList, settingsCollectionOptions]);

    const allCollections = useMemo(() => sortByUsage(
        settingsCollectionOptions, collectionUsageCounts, collectionOptionOrder
    ), [settingsCollectionOptions, collectionUsageCounts, collectionOptionOrder]);

    const colorCountsByKey = useMemo(() => countValues(
        jewelryList.flatMap(item => uniqueCatalogLabels(item.colors || [], colorKey).map(colorKey))
    ), [jewelryList]);

    const materialCountsByKey = useMemo(() => countValues(
        jewelryList.flatMap(item => uniqueCatalogLabels(item.materials || [], materialKey).map(materialKey))
    ), [jewelryList]);

    const allMaterialOptions = useMemo(() => {
        const embedded = jewelryList.flatMap(item => item.materials || []);
        return uniqueCatalogLabels([...BASE_MATERIALS, ...customMaterials, ...embedded]
            .filter(mat => mat && !hiddenMaterialOptions.some(hidden => materialKey(hidden) === materialKey(mat))), materialKey);
    }, [jewelryList, customMaterials, hiddenMaterialOptions]);

    const settingsMaterialOptions = useMemo(() => orderOptions(allMaterialOptions, materialOptionOrder), [allMaterialOptions, materialOptionOrder]);

    const materialUsageCounts = useMemo(() => Object.fromEntries(settingsMaterialOptions.map(label => [label, materialCountsByKey[materialKey(label)] || 0])), [settingsMaterialOptions, materialCountsByKey]);

    const allAvailableMaterials = useMemo(() => sortByUsage(settingsMaterialOptions, materialUsageCounts, materialOptionOrder), [settingsMaterialOptions, materialUsageCounts, materialOptionOrder]);

    const settingsPlatformOptions = useMemo(() => orderOptions(Array.from(new Set([...BASE_PLATFORMS, ...customPlatforms])).filter(platform => platform && !hiddenPlatformOptions.includes(platform)), platformOptionOrder.length ? platformOptionOrder : BASE_PLATFORMS), [customPlatforms, hiddenPlatformOptions, platformOptionOrder]);

    const allAvailablePlatforms = useMemo(() => sortByUsage(settingsPlatformOptions, platformUsageCounts, platformOptionOrder.length ? platformOptionOrder : BASE_PLATFORMS), [settingsPlatformOptions, platformUsageCounts, platformOptionOrder]);

    const allColorOptions = useMemo(() => {
        const embedded = jewelryList.flatMap(item => item.colors || []);
        return uniqueCatalogLabels([...BASE_COLORS, ...customColors, ...embedded]
            .filter(color => color && !hiddenColorOptions.some(hidden => colorKey(hidden) === colorKey(color))), colorKey);
    }, [jewelryList, customColors, hiddenColorOptions]);

    const settingsColorOptions = useMemo(() => orderOptions(allColorOptions, colorOptionOrder), [allColorOptions, colorOptionOrder]);

    const colorUsageCounts = useMemo(() => Object.fromEntries(settingsColorOptions.map(label => [label, colorCountsByKey[colorKey(label)] || 0])), [settingsColorOptions, colorCountsByKey]);

    const allAvailableColors = useMemo(() => sortByUsage(settingsColorOptions, colorUsageCounts, colorOptionOrder), [settingsColorOptions, colorUsageCounts, colorOptionOrder]);

    const getColorSwatch = (color) => catalogColorSwatch(color, shopSettings.colorPalette);

    const allFilterColors = useMemo(() => uniqueCatalogLabels(
        [...allAvailableColors, ...jewelryList.flatMap(item => item.colors || [])], colorKey
    ), [allAvailableColors, jewelryList]);

    const allStorages = useMemo(() => {
        return Array.from(new Set(jewelryList.map(item => item.storage))).filter(Boolean).sort();
    }, [jewelryList]);

    const duplicateNameInfo = useMemo(() => {
        const normalizedName = normalizeForMatch(formName);
        if (!normalizedName) return null;
        const duplicate = jewelryList.find(item => {
            if (isEditMode && currentItem?.id === item.id) return false;
            return normalizeForMatch(item.name) === normalizedName;
        });
        if (!duplicate) return null;
        const baseName = formName.trim();
        const firstColor = formColorsArr[0] || '';
        const firstMaterial = formMaterials[0] || '';
        const suggestionParts = [
            formCategory && `${baseName} - ${formCategory}`,
            firstColor && `${baseName} σε ${firstColor}`,
            firstMaterial && `${baseName} με ${firstMaterial}`,
            formCollection && `${baseName} | ${formCollection}`,
            `${baseName} #${jewelryList.filter(item => normalizeForMatch(item.name).startsWith(normalizedName)).length + 1}`
        ].filter(Boolean);
        return {
            duplicate,
            suggestions: Array.from(new Set(suggestionParts)).filter(name => normalizeForMatch(name) !== normalizedName).slice(0, 4)
        };
    }, [formName, formCategory, formCollection, formColorsArr, formMaterials, jewelryList, isEditMode, currentItem]);

    const rememberCustomValues = ({ category = formCategory, collection = formCollection, colors = formColorsArr, materials = formMaterials } = {}) => {
        const cat = category.trim();
        if (cat && !BASE_CATEGORIES.includes(cat) && !customCategories.includes(cat)) setCustomCategories(prev => [...prev, cat]);
        const col = collection.trim();
        if (col && !customCollections.includes(col)) setCustomCollections(prev => [...prev, col]);
        colors.forEach(color => {
            if (color && !BASE_COLORS.includes(color) && !customColors.includes(color)) setCustomColors(prev => [...prev, color]);
        });
        materials.forEach(material => {
            if (material && !BASE_MATERIALS.includes(material) && !customMaterials.includes(material)) setCustomMaterials(prev => [...prev, material]);
        });
    };

    const handleFieldOptionDragStart = (e, type, value) => {
        setDraggedFieldOption({ type, value });
        e.dataTransfer.effectAllowed = "move";
    };

    const getFieldOptionsForType = (type) => {
        if (type === 'category') return settingsCategoryOptions;
        if (type === 'status') return settingsStatusOptions;
        if (type === 'collection') return settingsCollectionOptions;
        if (type === 'platform') return settingsPlatformOptions;
        if (type === 'color') return settingsColorOptions;
        return settingsMaterialOptions;
    };

    const getFieldOrderForType = (type) => {
        if (type === 'category') return shopSettings.categoryOrder || [];
        if (type === 'status') return statusOptionOrder;
        if (type === 'collection') return collectionOptionOrder;
        if (type === 'platform') return platformOptionOrder;
        if (type === 'color') return colorOptionOrder;
        return materialOptionOrder;
    };

    const setFieldOrderForType = (type, nextOrder) => {
        if (type === 'category') {
            setShopSettings(prev => ({ ...prev, categoryOrder: nextOrder }));
            if (firebaseReady) setDoc(doc(db, "settings", "shop"), { categoryOrder: nextOrder }, { merge: true }).catch(() => {});
        } else if (type === 'status') {
            setStatusOptionOrder(nextOrder);
        } else if (type === 'collection') {
            setCollectionOptionOrder(nextOrder);
        } else if (type === 'platform') {
            setPlatformOptionOrder(nextOrder);
        } else if (type === 'color') {
            setColorOptionOrder(nextOrder);
        } else {
            setMaterialOptionOrder(nextOrder);
        }
    };

    const handleFieldOptionDrop = (e, type, targetValue) => {
        e.preventDefault();
        if (!draggedFieldOption || draggedFieldOption.type !== type || draggedFieldOption.value === targetValue) return;
        const options = getFieldOptionsForType(type);
        const currentOrder = getFieldOrderForType(type);
        const normalizedOrder = orderOptions(Array.from(new Set([...currentOrder, ...options])), currentOrder);
        const fromIndex = normalizedOrder.indexOf(draggedFieldOption.value);
        const toIndex = normalizedOrder.indexOf(targetValue);
        if (fromIndex === -1 || toIndex === -1) return;
        const nextOrder = [...normalizedOrder];
        const [moved] = nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, moved);
        setFieldOrderForType(type, nextOrder);
        setDraggedFieldOption(null);
    };

    const handleHideFieldOption = (type, value) => {
        if (type === 'category') {
            setHiddenCategoryOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomCategories(prev => prev.filter(category => category !== value));
            if (formCategory === value) setFormCategory(BASE_CATEGORIES[0] || '');
        } else if (type === 'status') {
            setHiddenStatusOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomStatuses(prev => prev.filter(status => status !== value));
            if (formStatus === value) setFormStatus(BASE_STATUSES[0] || '');
        } else if (type === 'collection') {
            setHiddenCollectionOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomCollections(prev => prev.filter(collection => collection !== value));
            if (formCollection === value) setFormCollection('');
        } else if (type === 'platform') {
            setHiddenPlatformOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomPlatforms(prev => prev.filter(platform => platform !== value));
            setFormPurchaseLinks(prev => prev.filter(link => link.site !== value));
            setFormPostedPlatforms(prev => prev.filter(platform => platform.site !== value));
        } else if (type === 'color') {
            setHiddenColorOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomColors(prev => prev.filter(color => color !== value));
            setFormColorsArr(prev => prev.filter(color => color !== value));
        } else {
            setHiddenMaterialOptions(prev => prev.includes(value) ? prev : [...prev, value]);
            setCustomMaterials(prev => prev.filter(material => material !== value));
            setFormMaterials(prev => prev.filter(material => material !== value));
        }
    };

    const handleRestoreFieldOption = (type, value) => {
        if (type === 'category') setHiddenCategoryOptions(prev => prev.filter(category => category !== value));
        else if (type === 'status') setHiddenStatusOptions(prev => prev.filter(status => status !== value));
        else if (type === 'collection') setHiddenCollectionOptions(prev => prev.filter(collection => collection !== value));
        else if (type === 'platform') setHiddenPlatformOptions(prev => prev.filter(platform => platform !== value));
        else if (type === 'color') setHiddenColorOptions(prev => prev.filter(color => color !== value));
        else setHiddenMaterialOptions(prev => prev.filter(material => material !== value));
    };

    const handleSortFieldOptionsByUsage = (type) => {
        const options = getFieldOptionsForType(type);
        const order = getFieldOrderForType(type);
        const counts = type === 'category' ? categoryUsageCounts
            : type === 'status' ? statusUsageCounts
            : type === 'collection' ? collectionUsageCounts
            : type === 'platform' ? platformUsageCounts
            : type === 'color' ? colorUsageCounts
            : materialUsageCounts;
        setFieldOrderForType(type, sortByUsage(options, counts, order));
    };

    const handleAddMaterial = (mat) => {
        const trimmed = mat.trim();
        if (trimmed && !formMaterials.some(value => materialKey(value) === materialKey(trimmed))) {
            setFormMaterials([...formMaterials, trimmed]);
            if (!BASE_MATERIALS.includes(trimmed) && !customMaterials.includes(trimmed)) setCustomMaterials(prev => [...prev, trimmed]);
            setHiddenMaterialOptions(prev => prev.filter(material => material !== trimmed));
            setMaterialOptionOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
            setNewMaterialInput('');
        }
    };

    const handleAddColor = (col, hex = '') => {
        const trimmed = col.trim();
        if (trimmed && !formColorsArr.some(value => colorKey(value) === colorKey(trimmed))) {
            setFormColorsArr([...formColorsArr, trimmed]);
            if (!BASE_COLORS.includes(trimmed) && !customColors.includes(trimmed)) setCustomColors(prev => [...prev, trimmed]);
            setHiddenColorOptions(prev => prev.filter(color => color !== trimmed));
            setColorOptionOrder(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
            if (hex) {
                const nextPalette = { ...(shopSettings.colorPalette || {}), [trimmed]: hex };
                setShopSettings(prev => ({ ...prev, colorPalette: { ...(prev.colorPalette || {}), [trimmed]: hex } }));
                setDoc(doc(db, 'settings', 'shop'), { colorPalette: nextPalette }, { merge: true })
                    .catch(() => alert('Το χρώμα προστέθηκε στο προϊόν, αλλά δεν αποθηκεύτηκε στην κοινή παλέτα.'));
            }
            setNewColorInput('');
        }
    };

    const handleAddPurchaseLink = () => {
        const siteTrimmed = newPurchaseSite.trim();
        if (!siteTrimmed) return;

        setFormPurchaseLinks([...formPurchaseLinks, { site: siteTrimmed, url: newPurchaseUrl.trim() }]);

        if (!BASE_PLATFORMS.includes(siteTrimmed) && !customPlatforms.includes(siteTrimmed)) {
            setCustomPlatforms(prev => [...prev, siteTrimmed]);
        }

        setNewPurchaseSite('Vinted');
        setNewPurchaseUrl('');
        setIsCustomPurchaseSite(false);
    };

    const handleAddPostedPlatform = () => {
        const siteTrimmed = newPostedSite.trim();
        if (!siteTrimmed) return;

        if (!formPostedPlatforms.some(p => p.site === siteTrimmed && p.url === newPostedUrl.trim())) {
            setFormPostedPlatforms([...formPostedPlatforms, { site: siteTrimmed, url: newPostedUrl.trim(), showInShop: newPostedVisible }]);
            if (!BASE_PLATFORMS.includes(siteTrimmed) && !customPlatforms.includes(siteTrimmed)) {
                setCustomPlatforms(prev => [...prev, siteTrimmed]);
            }
        }

        setNewPostedSite('Instagram');
        setNewPostedUrl('');
        setNewPostedVisible(false);
        setIsCustomPostedSite(false);
    };

    const ensureShopCategoryOrder = async (category) => {
        const cat = category.trim();
        if (!cat) return shopSettings.categoryOrder || [];
        const currentOrder = shopSettings.categoryOrder?.length ? shopSettings.categoryOrder : DEFAULT_SHOP_SETTINGS.categoryOrder;
        if (currentOrder.includes(cat)) return currentOrder;
        const nextOrder = [...currentOrder, cat];
        setShopSettings(prev => ({ ...prev, categoryOrder: prev.categoryOrder?.includes(cat) ? prev.categoryOrder : [...(prev.categoryOrder || []), cat] }));
        await setDoc(doc(db, "settings", "shop"), { categoryOrder: nextOrder }, { merge: true });
        return nextOrder;
    };

    const renderFieldOptionManager = ({ type, title, options, counts, hiddenOptions, tone = 'stone' }) => {
        const isIndigo = tone === 'indigo';
        const panelClass = isIndigo ? 'border border-indigo-100 bg-indigo-50/40 rounded-xl p-4' : 'border border-stone-200 bg-stone-50 rounded-xl p-4';
        const titleClass = isIndigo ? 'text-sm font-black text-indigo-700 uppercase' : 'text-sm font-black text-stone-700 uppercase';
        const buttonClass = isIndigo ? 'px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition' : 'px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-100 transition';
        const countClass = isIndigo ? 'text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full' : 'text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full';
        const itemClass = isIndigo ? 'flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing' : 'flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing';
        const restoreClass = isIndigo ? 'text-[11px] px-2 py-1 bg-white border border-indigo-100 rounded text-indigo-700' : 'text-[11px] px-2 py-1 bg-white border border-stone-200 rounded text-stone-700';

        return (
            <div className={panelClass}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className={titleClass}>{title}</h3>
                    <button onClick={() => handleSortFieldOptionsByUsage(type)} className={buttonClass}>Συχνότερα πρώτα</button>
                </div>
                <div className="flex flex-col gap-2">
                    {options.length === 0 && <span className="text-sm text-stone-400 italic px-1 py-2">Καμία καταχώρηση.</span>}
                    {options.map(option => (
                        <div
                            key={option}
                            draggable
                            onDragStart={(e) => handleFieldOptionDragStart(e, type, option)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleFieldOptionDrop(e, type, option)}
                            onDragEnd={() => setDraggedFieldOption(null)}
                            className={itemClass}
                        >
                            <IconGripVertical />
                            {type === 'color' && (
                                <span
                                    className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-2xs shrink-0"
                                    style={{ backgroundColor: getColorSwatch(option) }}
                                />
                            )}
                            <span className="flex-1 text-sm font-bold text-stone-700">{option}</span>
                            <span className={countClass}>{counts[option] || 0}</span>
                            <button onClick={() => handleHideFieldOption(type, option)} className="text-red-500 hover:text-red-700" title="Αφαίρεση από προτάσεις"><IconTrash /></button>
                        </div>
                    ))}
                </div>
                {hiddenOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {hiddenOptions.map(option => (
                            <button key={option} onClick={() => handleRestoreFieldOption(type, option)} className={restoreClass}>Επαναφορά {option}</button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return {
        getStatusColor, categoryUsageCounts, statusUsageCounts, collectionUsageCounts, platformUsageCounts,
        allFormCategories, settingsCategoryOptions, allFilterCategories, allFormStatuses,
        settingsStatusOptions, allCollections, settingsCollectionOptions, colorUsageCounts,
        materialUsageCounts, settingsMaterialOptions, allAvailableMaterials, settingsPlatformOptions,
        allAvailablePlatforms, settingsColorOptions, allAvailableColors, getColorSwatch, allFilterColors,
        allStorages, duplicateNameInfo, rememberCustomValues, handleAddMaterial, handleAddColor,
        handleAddPurchaseLink, handleAddPostedPlatform, ensureShopCategoryOrder, renderFieldOptionManager
    };
}

export type CatalogOptions = ReturnType<typeof useCatalogOptions>;
