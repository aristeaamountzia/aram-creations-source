import { captureCatalogFields } from '../../lib/catalog-history';
import { publicProductDescription, uniqueCatalogLabels, colorKey, materialKey } from '../../lib/catalog-labels';
import { BASE_CATEGORIES, BASE_MATERIALS, BASE_COLORS, splitTags } from './catalog-config';
import { duplicateJewelryData, inventoryStock, isArchivedJewelry, statusForEditedStock, stockForSelectedStatus } from '../../lib/stock-edit';
import { writeJewelryChanges } from '../../lib/jewelry-store';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { notifyOperationSuccess, notifyOperationError } from '../../lib/sound-notifications';
import { db } from '../../firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import type { CatalogPreferences } from './useCatalogPreferences';
import type { CatalogFilters } from './useCatalogFilters';
import type { CatalogRecord, BackOfficeSharedState } from './backoffice-types';
import type { CatalogHistoryController } from './useCatalogHistory';

type CatalogBulkDependencies = Pick<
    CatalogPreferences,
    'customCategories' | 'customColors' | 'customMaterials' | 'setCustomCategories' | 'setCustomColors' |
    'setCustomMaterials'
> &
    Pick<CatalogFilters, 'filteredAndSortedJewelry' | 'setSortBy'> &
    Pick<BackOfficeSharedState, 'jewelryList'> &
    Pick<CatalogHistoryController, 'pushUndoAction' | 'pushVersionHistory'>;

/** Catalog selection, ordering and bulk changes using inventory-guarded transactions. */
export function useCatalogBulk(dependencies: CatalogBulkDependencies) {
    const {
        customCategories, customColors, customMaterials, filteredAndSortedJewelry, jewelryList, pushUndoAction,
        pushVersionHistory, setCustomCategories, setCustomColors, setCustomMaterials, setSortBy
    } = dependencies;

    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [selectionAnchorId, setSelectionAnchorId] = useState(null);
    const [lassoRect, setLassoRect] = useState(null);
    const lassoStartRef = useRef(null);
    const lassoBaseSelectionRef = useRef([]);
    const productGridRef = useRef(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [bulkTab, setBulkTab] = useState('fields');
    const [bulkDraft, setBulkDraft] = useState({
        category: '',
        collection: '',
        shopPlacement: '',
        status: '',
        price: '',
        materials: [],
        colors: [],
        notes: ''
    });

    const [bulkFindText, setBulkFindText] = useState('');
    const [bulkReplaceText, setBulkReplaceText] = useState('');
    const [bulkFindScopes, setBulkFindScopes] = useState({
        name: true,
        notes: true,
        materials: false,
        colors: false,
        collection: false
    });

    const [bulkCaseSensitive, setBulkCaseSensitive] = useState(false);
    const [bulkWholeWord, setBulkWholeWord] = useState(false);
    const [bulkStock, setBulkStock] = useState('');
    const [bulkPriceAdjustmentMode, setBulkPriceAdjustmentMode] = useState('none');
    const [bulkPriceAdjustmentValue, setBulkPriceAdjustmentValue] = useState('');
    const [bulkTagMode, setBulkTagMode] = useState('append');
    const [draggedProductId, setDraggedProductId] = useState(null);
    const [dragOverProductId, setDragOverProductId] = useState(null);
    const productDragAutoScrollRef = useRef({ frame: null, speed: 0 });

    const selectedItems = useMemo(() => {
        return jewelryList.filter(item => selectedItemIds.includes(item.id));
    }, [jewelryList, selectedItemIds]);

    const visibleItemIds = useMemo(() => filteredAndSortedJewelry.map(item => item.id), [filteredAndSortedJewelry]);

    const selectItem = (id, shiftKey = false) => {
        const anchor = selectionAnchorId || (selectedItemIds.length > 0 ? selectedItemIds[selectedItemIds.length - 1] : null);
        if (shiftKey && anchor) {
            const start = visibleItemIds.indexOf(anchor);
            const end = visibleItemIds.indexOf(id);
            if (start >= 0 && end >= 0) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                const range = visibleItemIds.slice(min, max + 1);
                setSelectedItemIds(prev => Array.from(new Set([...prev, ...range])));
                return;
            }
        }
        setSelectedItemIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
        setSelectionAnchorId(id);
    };

    const handleProductSelectionClick = (event, id) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, input, label, a, select, textarea, [data-no-lasso]')) return;
        if (event.shiftKey) {
            event.preventDefault();
            selectItem(id, true);
            return;
        }
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            selectItem(id, false);
            return;
        }
    };

    const finishLassoSelection = () => {
        lassoStartRef.current = null;
        setLassoRect(null);
    };

    const handleLassoStart = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, input, select, textarea, label, a, [data-no-lasso], [data-product-id]')) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const baseSelection = event.shiftKey ? [...selectedItemIds] : [];
        if (!event.shiftKey) setSelectedItemIds([]);

        let isDragging = false;

        const onPointerMove = (e: PointerEvent) => {
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (!isDragging && (dx > 4 || dy > 4)) {
                isDragging = true;
            }
            if (!isDragging) return;

            const minX = Math.min(startX, e.clientX);
            const maxX = Math.max(startX, e.clientX);
            const minY = Math.min(startY, e.clientY);
            const maxY = Math.max(startY, e.clientY);

            setLassoRect({ left: minX, top: minY, width: maxX - minX, height: maxY - minY });

            const touchedIds: string[] = [];
            const cardNodes = document.querySelectorAll('[data-product-id]');
            cardNodes.forEach((node) => {
                const rect = node.getBoundingClientRect();
                if (rect.left < maxX && rect.right > minX && rect.top < maxY && rect.bottom > minY) {
                    const pid = (node as HTMLElement).dataset.productId;
                    if (pid) touchedIds.push(pid);
                }
            });
            setSelectedItemIds(Array.from(new Set([...baseSelection, ...touchedIds])));
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            setLassoRect(null);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    };

    const handleLassoMove = (_event: React.PointerEvent<HTMLDivElement>) => {
        // Tracking handled via window pointermove
    };

    const selectVisibleItems = () => {
        setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleItemIds])));
    };

    const clearBulkSelection = () => {
        setSelectedItemIds([]);
        setIsBulkOpen(false);
        setBulkDraft({ category: '', collection: '', shopPlacement: '', status: '', price: '', materials: [], colors: [], notes: '' });
        setBulkFindText('');
        setBulkReplaceText('');
        setBulkStock('');
        setBulkPriceAdjustmentMode('none');
        setBulkPriceAdjustmentValue('');
    };

    const bulkMaterials = Array.isArray(bulkDraft.materials) ? bulkDraft.materials : splitTags(bulkDraft.materials || '');

    const bulkColors = Array.isArray(bulkDraft.colors) ? bulkDraft.colors : splitTags(bulkDraft.colors || '');

    const shopOrderedJewelry = useMemo(() => {
        return [...jewelryList].sort((a, b) => {
            return (b.shopOrder || 0) - (a.shopOrder || 0) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
    }, [jewelryList]);

    const toggleBulkTag = (field, value) => {
        setBulkDraft(prev => {
            const current = Array.isArray(prev[field]) ? prev[field] : splitTags(prev[field] || '');
            const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
            return { ...prev, [field]: next };
        });
    };

    const clearBulkTags = (field) => {
        setBulkDraft(prev => ({ ...prev, [field]: [] }));
    };

    const getShopOrderedList = () => {
        return shopOrderedJewelry;
    };

    const buildShopOrderUpdates = (reordered) => {
        return reordered.map((product, idx) => {
            const nextShopOrder = (reordered.length - idx) * 10;
            return {
                id: product.id,
                oldData: captureCatalogFields(product, ['shopOrder']),
                newData: { shopOrder: nextShopOrder }
            };
        }).filter(update => (update.oldData.shopOrder || 0) !== update.newData.shopOrder);
    };

    const getGroupShopOrderUpdates = ({ movingIds, placement, targetId }: { movingIds: string[]; placement?: string; targetId?: string }) => {
        const shopList = getShopOrderedList();
        const movingSet = new Set(movingIds || []);
        const moving = shopList.filter(item => movingSet.has(item.id));
        if (!moving.length) return [];
        if (targetId && movingSet.has(targetId)) return [];

        const remaining = shopList.filter(item => !movingSet.has(item.id));
        let insertIndex = 0;

        if (targetId) {
            const targetIndexInOriginal = shopList.findIndex(item => item.id === targetId);
            const firstMovingIndex = shopList.findIndex(item => movingSet.has(item.id));
            const targetIndexInRemaining = remaining.findIndex(item => item.id === targetId);
            if (targetIndexInRemaining === -1 || firstMovingIndex === -1) return [];
            insertIndex = targetIndexInOriginal > firstMovingIndex ? targetIndexInRemaining + 1 : targetIndexInRemaining;
        } else if (placement === 'top') {
            insertIndex = 0;
        } else if (placement === 'bottom') {
            insertIndex = remaining.length;
        } else {
            const firstMovingIndex = shopList.findIndex(item => movingSet.has(item.id));
            if (firstMovingIndex === -1) return [];
            const currentInsertIndex = shopList.slice(0, firstMovingIndex).filter(item => !movingSet.has(item.id)).length;
            insertIndex = placement === 'up'
                ? Math.max(0, currentInsertIndex - 1)
                : Math.min(remaining.length, currentInsertIndex + 1);
        }

        insertIndex = Math.max(0, Math.min(insertIndex, remaining.length));
        return buildShopOrderUpdates([
            ...remaining.slice(0, insertIndex),
            ...moving,
            ...remaining.slice(insertIndex)
        ]);
    };

    const getBulkShopOrderUpdates = (placement) => {
        if (!placement) return [];
        return getGroupShopOrderUpdates({ movingIds: selectedItemIds, placement });
    };

    const isShopOrderMoveDisabled = (item, direction) => {
        const shopList = getShopOrderedList();
        const movingIds = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
        const movingSet = new Set(movingIds);
        const firstMovingIndex = shopList.findIndex(product => movingSet.has(product.id));
        if (firstMovingIndex === -1) return true;
        const remaining = shopList.filter(product => !movingSet.has(product.id));
        const currentInsertIndex = shopList.slice(0, firstMovingIndex).filter(product => !movingSet.has(product.id)).length;
        return direction === 'up' ? currentInsertIndex === 0 : currentInsertIndex >= remaining.length;
    };

    const handleBulkFindAndReplace = async (isDeleteOnly = false) => {
        if (!bulkFindText.trim()) {
            alert('Παρακαλώ εισάγετε λέξη ή φράση προς εντοπισμό.');
            return;
        }
        if (selectedItems.length === 0) {
            alert('Δεν έχουν επιλεγεί προϊόντα.');
            return;
        }

        const searchTarget = bulkFindText;
        const replacement = isDeleteOnly ? '' : bulkReplaceText;

        let patternStr = searchTarget.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
        if (bulkWholeWord) {
            patternStr = `\\b${patternStr}\\b`;
        }
        const flags = bulkCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(patternStr, flags);

        let matchCount = 0;
        const updatesList = [];

        const replaceInString = (val) => {
            if (!val || typeof val !== 'string') return val;
            let res = val.replace(regex, replacement);
            if (isDeleteOnly) {
                res = res.replace(/\s{2,}/g, ' ').trim();
            }
            return res;
        };

        selectedItems.forEach(item => {
            const newData: CatalogRecord = {};
            let changed = false;

            if (bulkFindScopes.name && item.name) {
                const nextName = replaceInString(item.name);
                if (nextName !== item.name) {
                    newData.name = nextName;
                    changed = true;
                    matchCount++;
                }
            }

            if (bulkFindScopes.notes) {
                const description = publicProductDescription(item);
                const nextDescription = replaceInString(description);
                if (nextDescription !== description) {
                    newData.description = nextDescription;
                    changed = true;
                    matchCount++;
                }
            }

            if (bulkFindScopes.collection && item.collection) {
                const nextCol = replaceInString(item.collection);
                if (nextCol !== item.collection) {
                    newData.collection = nextCol;
                    changed = true;
                    matchCount++;
                }
            }

            if (bulkFindScopes.materials && Array.isArray(item.materials)) {
                const nextMats = item.materials
                    .map(m => replaceInString(m))
                    .filter(Boolean);
                if (JSON.stringify(nextMats) !== JSON.stringify(item.materials)) {
                    newData.materials = nextMats;
                    changed = true;
                    matchCount++;
                }
            }

            if (bulkFindScopes.colors && Array.isArray(item.colors)) {
                const nextCols = item.colors
                    .map(c => replaceInString(c))
                    .filter(Boolean);
                if (JSON.stringify(nextCols) !== JSON.stringify(item.colors)) {
                    newData.colors = nextCols;
                    changed = true;
                    matchCount++;
                }
            }

            if (changed) {
                updatesList.push({ id: item.id, oldData: captureCatalogFields(item, Object.keys(newData)), newData });
            }
        });

        if (updatesList.length === 0) {
            alert(`Δεν εντοπίστηκε η λέξη "${searchTarget}" στα επιλεγμένα πεδία των ${selectedItems.length} προϊόντων.`);
            return;
        }

        const actionLabel = isDeleteOnly ? 'Διαγραφή' : 'Αντικατάσταση';
        if (!window.confirm(`${actionLabel}: Εντοπίστηκαν ${matchCount} αντικαταστάσεις σε ${updatesList.length} προϊόντα. Θέλετε να εφαρμοστεί η αλλαγή;`)) {
            return;
        }

        try {
            await writeJewelryChanges(db, updatesList.map(u => ({ id: u.id, patch: u.newData, baseline: selectedItems.find(item => item.id === u.id) })));

            pushUndoAction({
                type: 'BULK_UPDATE',
                items: updatesList,
                message: `${actionLabel} λέξης σε ${updatesList.length} προϊόντα.`
            });

            alert(`Ολοκληρώθηκε: Έγιναν ${matchCount} αλλαγές σε ${updatesList.length} προϊόντα.`);
            notifyOperationSuccess('Αντικατάσταση Κειμένου', `Ολοκληρώθηκε: Έγιναν ${matchCount} αλλαγές σε ${updatesList.length} προϊόντα.`);
            clearBulkSelection();
        } catch (err) {
            notifyOperationError('Σφάλμα Αντικατάστασης', err.message || String(err));
            alert('Σφάλμα κατά την αντικατάσταση: ' + (err.message || err));
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedItems.length === 0) return;
        const updates: CatalogRecord = {};
        if (bulkDraft.category.trim()) updates.category = bulkDraft.category.trim();
        if (bulkDraft.collection.trim()) updates.collection = bulkDraft.collection.trim();
        if (bulkDraft.status.trim()) {
            updates.status = bulkDraft.status.trim();
            if (updates.status === 'Πουλήθηκε') updates.stock = 0;
        }
        if (bulkDraft.price !== '') {
            const parsedBulkPrice = Number(bulkDraft.price);
            if (Number.isNaN(parsedBulkPrice) || parsedBulkPrice < 0) {
                alert("Η μαζική τιμή πρέπει να είναι μη αρνητικός αριθμός.");
                return;
            }
            updates.price = parsedBulkPrice;
        }
        if (bulkStock !== '') {
            const parsedStock = Number(bulkStock);
            if (!Number.isInteger(parsedStock) || parsedStock < 0) {
                alert('Το απόθεμα πρέπει να είναι μη αρνητικός ακέραιος αριθμός.');
                return;
            }
            updates.stock = parsedStock;
        }
        if (updates.status === 'Πουλήθηκε') updates.stock = 0;
        if (bulkDraft.notes.trim()) updates.description = bulkDraft.notes.trim();
        const shopOrderUpdates = getBulkShopOrderUpdates(bulkDraft.shopPlacement);
        const bulkUpdateMap = new Map();
        const mergeBulkUpdate = (id, oldData, newData) => {
            const existing = bulkUpdateMap.get(id) || { id, oldData: {}, newData: {} };
            existing.oldData = { ...existing.oldData, ...oldData };
            existing.newData = { ...existing.newData, ...newData };
            bulkUpdateMap.set(id, existing);
        };

        // Process selected items with field updates, pricing adjustments, and tag additions/removals
        selectedItems.forEach(item => {
            const itemUpdates = { ...updates };
            if (updates.stock !== undefined && updates.status !== 'Πουλήθηκε') {
                const status = statusForEditedStock(updates.status || item.status, Number(updates.stock));
                if (status && (updates.status || status !== item.status)) itemUpdates.status = status;
            } else if (updates.status === 'Διαθέσιμο' && inventoryStock(item) <= 0) {
                itemUpdates.stock = stockForSelectedStatus(updates.status, inventoryStock(item));
            }

            // Handle price percentage or fixed amount adjustment
            if (bulkPriceAdjustmentMode !== 'none' && bulkPriceAdjustmentValue !== '') {
                const adjVal = Number(bulkPriceAdjustmentValue);
                if (!Number.isNaN(adjVal) && adjVal > 0) {
                    const curPrice = Number(item.price) || 0;
                    let nextPrice = curPrice;
                    if (bulkPriceAdjustmentMode === 'percent_increase') {
                        nextPrice = Math.round((curPrice * (1 + adjVal / 100)) * 2) / 2;
                    } else if (bulkPriceAdjustmentMode === 'percent_decrease') {
                        nextPrice = Math.max(0, Math.round((curPrice * (1 - adjVal / 100)) * 2) / 2);
                    } else if (bulkPriceAdjustmentMode === 'fixed_increase') {
                        nextPrice = Math.round((curPrice + adjVal) * 2) / 2;
                    } else if (bulkPriceAdjustmentMode === 'fixed_decrease') {
                        nextPrice = Math.max(0, Math.round((curPrice - adjVal) * 2) / 2);
                    }
                    itemUpdates.price = nextPrice;
                }
            }

            // Handle tag modes (append, remove, overwrite)
            if (bulkMaterials.length > 0) {
                const curMats = Array.isArray(item.materials) ? item.materials : [];
                if (bulkTagMode === 'append') {
                    itemUpdates.materials = uniqueCatalogLabels([...curMats, ...bulkMaterials], materialKey);
                } else if (bulkTagMode === 'remove') {
                    itemUpdates.materials = curMats.filter(m => !bulkMaterials.some(tag => materialKey(tag) === materialKey(m)));
                } else {
                    itemUpdates.materials = uniqueCatalogLabels(bulkMaterials, materialKey);
                }
            }

            if (bulkColors.length > 0) {
                const curCols = Array.isArray(item.colors) ? item.colors : [];
                if (bulkTagMode === 'append') {
                    itemUpdates.colors = uniqueCatalogLabels([...curCols, ...bulkColors], colorKey);
                } else if (bulkTagMode === 'remove') {
                    itemUpdates.colors = curCols.filter(c => !bulkColors.some(tag => colorKey(tag) === colorKey(c)));
                } else {
                    itemUpdates.colors = uniqueCatalogLabels(bulkColors, colorKey);
                }
            }

            const itemFields = Object.keys(itemUpdates);
            if (itemFields.length > 0) {
                mergeBulkUpdate(
                    item.id,
                    captureCatalogFields(item, itemFields),
                    itemUpdates
                );
            }
        });
        shopOrderUpdates.forEach(item => mergeBulkUpdate(item.id, item.oldData, item.newData));
        const undoItems = Array.from(bulkUpdateMap.values());
        // Price modifiers and tag operations contribute changes after the basic fields.
        if (undoItems.length === 0) {
            alert(bulkDraft.shopPlacement
                ? "Η σειρά Shop δεν χρειάστηκε αλλαγή για τα επιλεγμένα προϊόντα."
                : "Συμπληρώστε τουλάχιστον ένα πεδίο για μαζική ενημέρωση.");
            return;
        }

        try {
            if (undoItems.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική ενέργεια.');
            await writeJewelryChanges(db, undoItems.map(item => ({ id: item.id, patch: item.newData, baseline: jewelryList.find(original => original.id === item.id) })));
            pushUndoAction({ type: 'BULK_UPDATE', items: undoItems, message: bulkDraft.shopPlacement ? 'Ενημερώθηκε η μαζική επεξεργασία και η σειρά Shop.' : 'Ενημερώθηκαν ' + selectedItems.length + ' προϊόντα.' });
            if (updates.category && !BASE_CATEGORIES.includes(updates.category) && !customCategories.includes(updates.category)) setCustomCategories(prev => [...prev, updates.category]);
            if (updates.colors) updates.colors.forEach(color => {
                if (color && !BASE_COLORS.includes(color) && !customColors.includes(color)) setCustomColors(prev => [...prev, color]);
            });
            if (updates.materials) updates.materials.forEach(material => {
                if (material && !BASE_MATERIALS.includes(material) && !customMaterials.includes(material)) setCustomMaterials(prev => [...prev, material]);
            });
            if (shopOrderUpdates.length) setSortBy('shop_order');
            notifyOperationSuccess('Μαζική Ενημέρωση', `Ενημερώθηκαν ${selectedItems.length} προϊόντα επιτυχώς!`);
            clearBulkSelection();
        } catch (err) {
            notifyOperationError('Σφάλμα Μαζικής Ενημέρωσης', err.message);
            alert("Αποτυχία μαζικής ενημέρωσης: " + err.message);
        }
    };

    const handleBulkArchive = async (archive: boolean) => {
        if (isArchiving) return;
        const items = selectedItems.filter(item => isArchivedJewelry(item) !== archive);
        if (items.length === 0) return;
        const patch = archive ? { isDeleted: true } : { isDeleted: false, deletedAt: null };
        const message = archive ? `Αρχειοθετήθηκαν ${items.length} προϊόντα.` : `Επανήλθαν ${items.length} προϊόντα στο ενεργό κατάλογο.`;
        setIsArchiving(true);
        try {
            const results = await writeJewelryChanges(db, items.map(item => ({ id: item.id, patch, baseline: item })));
            pushUndoAction({
                type: 'BULK_UPDATE',
                items: results.map(({ id, before }) => ({
                    id, oldData: captureCatalogFields(before, Object.keys(patch)), newData: patch
                })),
                message
            });
            clearBulkSelection();
            notifyOperationSuccess('Κατάλογος Shop', message);
        } catch (error) {
            notifyOperationError('Αποτυχία ενημέρωσης αρχείου', error instanceof Error ? error.message : String(error));
        } finally {
            setIsArchiving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!window.confirm('Να διαγραφούν ' + selectedItems.length + ' επιλεγμένα προϊόντα;')) return;
        const itemsForUndo = selectedItems.map(item => ({ id: item.id, data: item }));
        try {
            if (itemsForUndo.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική διαγραφή.');
            await writeJewelryChanges(db, itemsForUndo.map(item => ({ id: item.id, remove: true, baseline: item.data })));
            pushUndoAction({ type: 'BULK_DELETE', items: itemsForUndo, message: 'Διαγράφηκαν ' + selectedItems.length + ' προϊόντα.' });
            notifyOperationSuccess('Μαζική Διαγραφή', `Διαγράφηκαν ${selectedItems.length} προϊόντα επιτυχώς.`);
            clearBulkSelection();
        } catch (err) {
            notifyOperationError('Σφάλμα Μαζικής Διαγραφής', err.message);
            alert("Αποτυχία μαζικής διαγραφής: " + err.message);
        }
    };

    const handleBulkDuplicate = async () => {
        if (selectedItems.length === 0) return;
        try {
            if (selectedItems.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά μαζική αντιγραφή.');
            const changes = [];
            const duplicates = selectedItems.map(original => {
                const item: CatalogRecord = duplicateJewelryData(original);
                const ref = doc(collection(db, 'jewelry'));
                changes.push({ id: ref.id, create: true, duplicateOf: original.id, baseline: original, patch: {
                    ...item,
                    name: `${item.name || 'Προϊόν'} (Αντίγραφο)`,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                } });
                return { ...item, id: ref.id, name: `${item.name || 'Προϊόν'} (Αντίγραφο)` };
            });
            await writeJewelryChanges(db, changes);
            pushVersionHistory({
                type: 'BULK_DUPLICATE',
                id: '',
                name: 'Μαζική αντιγραφή',
                message: 'Αντιγράφηκαν ' + selectedItems.length + ' προϊόντα.',
                before: selectedItems,
                after: duplicates
            });
            notifyOperationSuccess('Μαζική Αντιγραφή', `Αντιγράφηκαν ${selectedItems.length} προϊόντα επιτυχώς!`);
            clearBulkSelection();
        } catch (err) {
            notifyOperationError('Σφάλμα Μαζικής Αντιγραφής', err.message);
            alert("Αποτυχία μαζικής αντιγραφής: " + err.message);
        }
    };

    const handleReorderProducts = async ({ movingIds, placement, targetId }: { movingIds: string[]; placement?: string; targetId?: string }) => {
        const updates = getGroupShopOrderUpdates({ movingIds, placement, targetId });
        if (!updates.length) return;

        try {
            if (updates.length > 500) throw new Error('Επιτρέπονται έως 500 προϊόντα ανά αλλαγή σειράς.');
            await writeJewelryChanges(db, updates.map(update => ({ id: update.id, patch: update.newData, baseline: update.oldData })));
            pushUndoAction({ type: 'BULK_UPDATE', items: updates, message: movingIds?.length > 1 ? 'Άλλαξε μαζικά η σειρά εμφάνισης στο Shop.' : 'Άλλαξε η σειρά εμφάνισης στο Shop.' });
            setSortBy('shop_order');
        } catch (err) {
            alert("Αποτυχία αλλαγής σειράς: " + err.message);
        }
    };

    const handleMoveShopOrder = async (item, direction) => {
        const movingIds = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
        await handleReorderProducts({ movingIds, placement: direction });
    };

    const stopProductDragAutoScroll = () => {
        const state = productDragAutoScrollRef.current;
        state.speed = 0;
        if (state.frame) {
            cancelAnimationFrame(state.frame);
            state.frame = null;
        }
    };

    const runProductDragAutoScroll = () => {
        const state = productDragAutoScrollRef.current;
        if (!state.speed) {
            state.frame = null;
            return;
        }
        window.scrollBy({ top: state.speed, left: 0, behavior: 'auto' });
        state.frame = requestAnimationFrame(runProductDragAutoScroll);
    };

    const handleProductDragAutoScroll = (event) => {
        if (!draggedProductId) return;
        const edgeSize = Math.min(140, Math.max(90, window.innerHeight * 0.16));
        const maxSpeed = 30;
        const distanceTop = event.clientY;
        const distanceBottom = window.innerHeight - event.clientY;
        let speed = 0;

        if (distanceTop < edgeSize) {
            speed = -Math.ceil(((edgeSize - distanceTop) / edgeSize) * maxSpeed);
        } else if (distanceBottom < edgeSize) {
            speed = Math.ceil(((edgeSize - distanceBottom) / edgeSize) * maxSpeed);
        }

        const state = productDragAutoScrollRef.current;
        state.speed = speed;
        if (!speed) {
            stopProductDragAutoScroll();
            return;
        }
        if (!state.frame) state.frame = requestAnimationFrame(runProductDragAutoScroll);
    };

    useEffect(() => {
        if (!draggedProductId) {
            stopProductDragAutoScroll();
            return;
        }

        const handleWindowDragOver = (event) => {
            event.preventDefault();
            handleProductDragAutoScroll(event);
        };
        const handleWindowDragEnd = () => stopProductDragAutoScroll();

        window.addEventListener('dragover', handleWindowDragOver, { passive: false });
        window.addEventListener('drop', handleWindowDragEnd);
        window.addEventListener('dragend', handleWindowDragEnd);

        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDragEnd);
            window.removeEventListener('dragend', handleWindowDragEnd);
            stopProductDragAutoScroll();
        };
    }, [draggedProductId]);

    const handleProductDragStart = (event, item) => {
        setDraggedProductId(item.id);
        setDragOverProductId(null);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
    };

    const handleProductDragOver = (event, item) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        handleProductDragAutoScroll(event);
        const movingIds = draggedProductId && selectedItemIds.includes(draggedProductId) ? selectedItemIds : [draggedProductId];
        if (movingIds.includes(item.id)) {
            if (dragOverProductId) setDragOverProductId(null);
            return;
        }
        if (dragOverProductId !== item.id) setDragOverProductId(item.id);
    };

    const handleProductDrop = async (event, targetItem) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('text/plain') || draggedProductId;
        stopProductDragAutoScroll();
        setDraggedProductId(null);
        setDragOverProductId(null);
        if (!sourceId || sourceId === targetItem.id) return;
        const movingIds = selectedItemIds.includes(sourceId) ? selectedItemIds : [sourceId];
        await handleReorderProducts({ movingIds, targetId: targetItem.id });
    };

    const handleProductDragEnd = () => {
        stopProductDragAutoScroll();
        setDraggedProductId(null);
        setDragOverProductId(null);
    };

    return {
        selectedItemIds, setSelectedItemIds, lassoRect, productGridRef, isBulkOpen, setIsBulkOpen, bulkTab,
        setBulkTab, bulkDraft, setBulkDraft, bulkFindText, setBulkFindText, bulkReplaceText,
        setBulkReplaceText, bulkFindScopes, setBulkFindScopes, bulkCaseSensitive, setBulkCaseSensitive,
        bulkWholeWord, setBulkWholeWord, bulkStock, setBulkStock, bulkPriceAdjustmentMode,
        setBulkPriceAdjustmentMode, bulkPriceAdjustmentValue, setBulkPriceAdjustmentValue, bulkTagMode,
        setBulkTagMode, draggedProductId, dragOverProductId, selectedItems, visibleItemIds, selectItem,
        handleProductSelectionClick, handleLassoStart, selectVisibleItems, clearBulkSelection, bulkMaterials,
        bulkColors, toggleBulkTag, clearBulkTags, isShopOrderMoveDisabled, handleBulkFindAndReplace,
        handleBulkUpdate, handleBulkArchive, isArchiving, handleBulkDelete, handleBulkDuplicate, handleMoveShopOrder, handleProductDragStart,
        handleProductDragOver, handleProductDrop, handleProductDragEnd
    };
}

export type CatalogBulk = ReturnType<typeof useCatalogBulk>;
