import { compressImage } from './image-processing';
import { useState, useEffect } from 'react';
import { useMediaUpload } from '../media/useMediaUpload';
import type { BackOfficeSharedState } from './backoffice-types';
import type { BackOfficeUploads } from './useBackOfficeUploads';

type ProductWorkspaceDependencies = Pick<BackOfficeSharedState, 'isSaving'> &
    Pick<BackOfficeUploads, 'prepareLocalVideo'>;

/** Product form state, draft persistence and temporary media ownership. */
export function useProductWorkspace(dependencies: ProductWorkspaceDependencies) {
    const { isSaving, prepareLocalVideo } = dependencies;

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState('form-basic');
    const [currentItem, setCurrentItem] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeDetailMediaIdx, setActiveDetailMediaIdx] = useState(0);
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('Κολιέ');
    const [formCollection, setFormCollection] = useState('');
    const [formStatus, setFormStatus] = useState('Διαθέσιμο');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formPrice, setFormPrice] = useState('');
    const [formOriginalPrice, setFormOriginalPrice] = useState('');
    const [formCost, setFormCost] = useState('');
    const [formStock, setFormStock] = useState<string | number>(1);
    const [formShopOrder, setFormShopOrder] = useState(0);
    const [formManualLikes, setFormManualLikes] = useState(0);
    const [formManualViews, setFormManualViews] = useState(0);
    const [formWeight, setFormWeight] = useState('');
    const [formDimensions, setFormDimensions] = useState('');
    const [formStorage, setFormStorage] = useState('');
    const [isCustomStorage, setIsCustomStorage] = useState(false);
    const [formMaterials, setFormMaterials] = useState([]);
    const [newMaterialInput, setNewMaterialInput] = useState('');
    const [formColorsArr, setFormColorsArr] = useState([]);
    const [newColorInput, setNewColorInput] = useState('');
    const [newColorHex, setNewColorHex] = useState('#c9a35e');
    const [formPurchaseLinks, setFormPurchaseLinks] = useState([]);
    const [newPurchaseSite, setNewPurchaseSite] = useState('Vinted');
    const [newPurchaseUrl, setNewPurchaseUrl] = useState('');
    const [isCustomPurchaseSite, setIsCustomPurchaseSite] = useState(false);
    const [formPostedPlatforms, setFormPostedPlatforms] = useState([]);
    const [newPostedSite, setNewPostedSite] = useState('Instagram');
    const [newPostedUrl, setNewPostedUrl] = useState('');
    const [newPostedVisible, setNewPostedVisible] = useState(false);
    const [isCustomPostedSite, setIsCustomPostedSite] = useState(false);
    const [formShopMediaList, setFormShopMediaList] = useState([]);
    const [formPrivateMediaList, setFormPrivateMediaList] = useState([]);

    const { prepareFiles: prepareEditorMediaFiles } = useMediaUpload({
        prepareImage: compressImage,
        prepareVideo: prepareLocalVideo
    });

    const closeItemEditor = () => {
        for (const media of [...formShopMediaList, ...formPrivateMediaList]) {
            for (const candidate of [media?.url, media?.restoreBackup?.url]) {
                if (typeof candidate === 'string' && candidate.startsWith('blob:')) URL.revokeObjectURL(candidate);
            }
        }
        setIsAddOpen(false);
    };

    const [formNotes, setFormNotes] = useState('');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [isCustomCollection, setIsCustomCollection] = useState(false);
    const [isCustomStatus, setIsCustomStatus] = useState(false);

    useEffect(() => {
        if (isAddOpen && !isEditMode && !isSaving) {
            const timer = setTimeout(() => {
                localStorage.setItem('aram_draft', JSON.stringify({
                    formName,
                    formCategory,
                    formCollection,
                    formStatus,
                    formDate,
                    formPrice,
                    formCost,
                    formStock,
                    formWeight,
                    formDimensions,
                    formStorage,
                    formNotes,
                    formMaterials,
                    formColorsArr,
                    formPurchaseLinks,
                    formPostedPlatforms
                }));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formName, formCategory, formCollection, formStatus, formDate, formPrice, formCost, formStock, formWeight, formDimensions, formStorage, formNotes, formMaterials, formColorsArr, formPurchaseLinks, formPostedPlatforms, isAddOpen, isEditMode, isSaving]);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDragTagStart = (e, idx, type) => {
        e.dataTransfer.setData("idx", idx);
        e.dataTransfer.setData("type", type);
    };

    const handleDropTag = (e, targetIdx, type) => {
        e.preventDefault();
        if (e.dataTransfer.getData("type") !== type) return;
        const sourceIdx = parseInt(e.dataTransfer.getData("idx"), 10);
        if (Number.isNaN(sourceIdx) || sourceIdx === targetIdx) return;
        if (type === 'color') {
            const next = [...formColorsArr];
            const [moved] = next.splice(sourceIdx, 1);
            next.splice(targetIdx, 0, moved);
            setFormColorsArr(next);
        } else if (type === 'material') {
            const next = [...formMaterials];
            const [moved] = next.splice(sourceIdx, 1);
            next.splice(targetIdx, 0, moved);
            setFormMaterials(next);
        }
    };

    return {
        isAddOpen, setIsAddOpen, isDetailOpen, setIsDetailOpen, activeFormTab, setActiveFormTab, currentItem,
        setCurrentItem, isEditMode, setIsEditMode, activeDetailMediaIdx, setActiveDetailMediaIdx, formName,
        setFormName, formCategory, setFormCategory, formCollection, setFormCollection, formStatus,
        setFormStatus, formDate, setFormDate, formPrice, setFormPrice, formOriginalPrice, setFormOriginalPrice,
        formCost, setFormCost, formStock, setFormStock, formShopOrder, setFormShopOrder, formManualLikes,
        setFormManualLikes, formManualViews, setFormManualViews, formWeight, setFormWeight, formDimensions,
        setFormDimensions, formStorage, setFormStorage, isCustomStorage, setIsCustomStorage, formMaterials,
        setFormMaterials, newMaterialInput, setNewMaterialInput, formColorsArr, setFormColorsArr,
        newColorInput, setNewColorInput, newColorHex, setNewColorHex, formPurchaseLinks, setFormPurchaseLinks,
        newPurchaseSite, setNewPurchaseSite, newPurchaseUrl, setNewPurchaseUrl, isCustomPurchaseSite,
        setIsCustomPurchaseSite, formPostedPlatforms, setFormPostedPlatforms, newPostedSite, setNewPostedSite,
        newPostedUrl, setNewPostedUrl, newPostedVisible, setNewPostedVisible, isCustomPostedSite,
        setIsCustomPostedSite, formShopMediaList, setFormShopMediaList, formPrivateMediaList,
        setFormPrivateMediaList, prepareEditorMediaFiles, closeItemEditor, formNotes, setFormNotes,
        isCustomCategory, setIsCustomCategory, isCustomCollection, setIsCustomCollection, isCustomStatus,
        setIsCustomStatus, handleDragTagStart, handleDropTag
    };
}

export type ProductWorkspace = ReturnType<typeof useProductWorkspace>;
