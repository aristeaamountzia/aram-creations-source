import { readStoredList, writeStoredList } from './catalog-config';
import { useState, useEffect } from 'react';


/** Persist custom field values, ordering and hidden options independently of dialogs. */
export function useCatalogPreferences() {
    const [customCategories, setCustomCategories] = useState(() => readStoredList('aram_custom_categories'));
    const [customCollections, setCustomCollections] = useState(() => readStoredList('aram_custom_collections'));
    const [customStatuses, setCustomStatuses] = useState(() => readStoredList('aram_custom_statuses'));
    const [customMaterials, setCustomMaterials] = useState(() => readStoredList('aram_custom_materials'));
    const [customPlatforms, setCustomPlatforms] = useState(() => readStoredList('aram_custom_platforms'));
    const [customColors, setCustomColors] = useState(() => readStoredList('aram_custom_colors'));
    const [statusOptionOrder, setStatusOptionOrder] = useState(() => readStoredList('aram_status_option_order'));
    const [collectionOptionOrder, setCollectionOptionOrder] = useState(() => readStoredList('aram_collection_option_order'));
    const [platformOptionOrder, setPlatformOptionOrder] = useState(() => readStoredList('aram_platform_option_order'));
    const [colorOptionOrder, setColorOptionOrder] = useState(() => readStoredList('aram_color_option_order'));
    const [materialOptionOrder, setMaterialOptionOrder] = useState(() => readStoredList('aram_material_option_order'));
    const [hiddenCategoryOptions, setHiddenCategoryOptions] = useState(() => readStoredList('aram_hidden_category_options'));
    const [hiddenStatusOptions, setHiddenStatusOptions] = useState(() => readStoredList('aram_hidden_status_options'));
    const [hiddenCollectionOptions, setHiddenCollectionOptions] = useState(() => readStoredList('aram_hidden_collection_options'));
    const [hiddenPlatformOptions, setHiddenPlatformOptions] = useState(() => readStoredList('aram_hidden_platform_options'));
    const [hiddenColorOptions, setHiddenColorOptions] = useState(() => readStoredList('aram_hidden_color_options'));
    const [hiddenMaterialOptions, setHiddenMaterialOptions] = useState(() => readStoredList('aram_hidden_material_options'));
    const [draggedFieldOption, setDraggedFieldOption] = useState(null);

    useEffect(() => writeStoredList('aram_custom_categories', customCategories), [customCategories]);

    useEffect(() => writeStoredList('aram_custom_collections', customCollections), [customCollections]);

    useEffect(() => writeStoredList('aram_custom_statuses', customStatuses), [customStatuses]);

    useEffect(() => writeStoredList('aram_custom_materials', customMaterials), [customMaterials]);

    useEffect(() => writeStoredList('aram_custom_platforms', customPlatforms), [customPlatforms]);

    useEffect(() => writeStoredList('aram_custom_colors', customColors), [customColors]);

    useEffect(() => writeStoredList('aram_status_option_order', statusOptionOrder), [statusOptionOrder]);

    useEffect(() => writeStoredList('aram_collection_option_order', collectionOptionOrder), [collectionOptionOrder]);

    useEffect(() => writeStoredList('aram_platform_option_order', platformOptionOrder), [platformOptionOrder]);

    useEffect(() => writeStoredList('aram_color_option_order', colorOptionOrder), [colorOptionOrder]);

    useEffect(() => writeStoredList('aram_material_option_order', materialOptionOrder), [materialOptionOrder]);

    useEffect(() => writeStoredList('aram_hidden_category_options', hiddenCategoryOptions), [hiddenCategoryOptions]);

    useEffect(() => writeStoredList('aram_hidden_status_options', hiddenStatusOptions), [hiddenStatusOptions]);

    useEffect(() => writeStoredList('aram_hidden_collection_options', hiddenCollectionOptions), [hiddenCollectionOptions]);

    useEffect(() => writeStoredList('aram_hidden_platform_options', hiddenPlatformOptions), [hiddenPlatformOptions]);

    useEffect(() => writeStoredList('aram_hidden_color_options', hiddenColorOptions), [hiddenColorOptions]);

    useEffect(() => writeStoredList('aram_hidden_material_options', hiddenMaterialOptions), [hiddenMaterialOptions]);

    return {
        customCategories, setCustomCategories, customCollections, setCustomCollections, customStatuses,
        setCustomStatuses, customMaterials, setCustomMaterials, customPlatforms, setCustomPlatforms,
        customColors, setCustomColors, statusOptionOrder, setStatusOptionOrder, collectionOptionOrder,
        setCollectionOptionOrder, platformOptionOrder, setPlatformOptionOrder, colorOptionOrder,
        setColorOptionOrder, materialOptionOrder, setMaterialOptionOrder, hiddenCategoryOptions,
        setHiddenCategoryOptions, hiddenStatusOptions, setHiddenStatusOptions, hiddenCollectionOptions,
        setHiddenCollectionOptions, hiddenPlatformOptions, setHiddenPlatformOptions, hiddenColorOptions,
        setHiddenColorOptions, hiddenMaterialOptions, setHiddenMaterialOptions, draggedFieldOption,
        setDraggedFieldOption
    };
}

export type CatalogPreferences = ReturnType<typeof useCatalogPreferences>;
