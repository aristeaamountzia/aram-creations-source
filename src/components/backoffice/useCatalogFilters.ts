import { isAvailableItem, isUnavailableItem, getEffectiveQty } from './catalog-config';
import { compareSoldLast, isSoldItem } from '../../lib/stock-edit';
import { useState, useMemo } from 'react';
import { ART_ITEMS } from '../../data';
import type { BackOfficeSharedState } from './backoffice-types';

type CatalogFiltersDependencies = Pick<BackOfficeSharedState, 'activeCollection' | 'jewelryList'>;

export function useCatalogFilters(dependencies: CatalogFiltersDependencies) {
    const { activeCollection, jewelryList } = dependencies;

    const [statsFilter, setStatsFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Όλα');
    const [selectedColor, setSelectedColor] = useState('Όλα');
    const [sortBy, setSortBy] = useState('shop_order');
    const [viewMode, setViewMode] = useState('grid');

    const getStatsSegment = (item) => {
        if (statsFilter === 'available') return isAvailableItem(item);
        if (statsFilter === 'unavailable') return isUnavailableItem(item);
        if (statsFilter === 'sold') return isSoldItem(item);
        return true;
    };

    const getStatsQuantity = (item) => {
        if (statsFilter === 'available') return Number(item.stock || 0);
        if (statsFilter === 'sold') return getEffectiveQty(item);
        return getEffectiveQty(item);
    };

    const dashboardStats = useMemo(() => {
        let count = 0;
        let value = 0;
        let profit = 0;

        jewelryList.forEach(item => {
            if (!getStatsSegment(item)) return;
            const qty = getStatsQuantity(item);
            count += qty;
            value += (Number(item.price || 0)) * qty;
            profit += (Number(item.price || 0) - Number(item.cost || 0)) * qty;
        });

        return { count, value, profit };
    }, [jewelryList, statsFilter]);

    const statsCopy = {
        available: { count: 'Διαθεσιμο Αποθεμα', value: 'Αξια Αποθεματος', profit: 'Εκτιμωμενο Κερδος' },
        unavailable: { count: 'Μη Διαθεσιμα Τεμαχια', value: 'Δεσμευμενη Αξια', profit: 'Εκτιμωμενο Κερδος' },
        sold: { count: 'Πωληθεντα Προιοντα', value: 'Εσοδα Πωληθεντων', profit: 'Καθαρο Κερδος' },
        all: { count: 'Συνολικα Τεμαχια', value: 'Συνολικη Αξια', profit: 'Συνολικο Κερδος' }
    }[statsFilter] || {};

    const filteredAndSortedJewelry = useMemo(() => {
        let sourceList = jewelryList;
        if (activeCollection === "portfolio") {
            const customPortfolio = jewelryList.filter(item => item.category !== "jewelry" && item.category !== "Κοσμήματα");
            if (customPortfolio.length > 0) {
                sourceList = customPortfolio;
            } else {
                sourceList = (ART_ITEMS || []).map((art: typeof ART_ITEMS[number] & Record<string, any>) => ({
                    id: art.id || String(Math.random()),
                    name: art.title || art.name || "Έργο Portfolio",
                    category: art.category || "Resin Art",
                    collection: art.year || "Portfolio Wix",
                    status: "Διαθέσιμο",
                    price: 0,
                    cost: 0,
                    stock: 1,
                    shopOrder: 0,
                    creationDate: art.year || "2024",
                    materials: [art.medium || "Art Work"],
                    colors: [],
                    shopMedia: art.images ? art.images.map((img) => ({ url: img, type: "image", showInShop: true })) : [{ url: art.imageUrl || art.image, type: "image", showInShop: true }],
                    privateMedia: [],
                    notes: art.description || "",
                    purchaseLinks: [],
                    postedPlatforms: []
                }));
            }
        }

        let pool = sourceList.filter(item => {
            const term = searchQuery.toLowerCase();
            const matchesStatsTab = getStatsSegment(item);
            const matchesSearch = (item.name || '').toLowerCase().includes(term) ||
                (item.collection && item.collection.toLowerCase().includes(term)) ||
                (item.storage && item.storage.toLowerCase().includes(term)) ||
                (item.materials && item.materials.some(m => m.toLowerCase().includes(term))) ||
                (item.colors && item.colors.some(c => c.toLowerCase().includes(term))) ||
                (item.platforms && item.platforms.some(p => p.toLowerCase().includes(term)));

            const matchesCategory = selectedCategory === 'Όλα' || item.category === selectedCategory;
            const matchesColor = selectedColor === 'Όλα' || (item.colors && item.colors.includes(selectedColor));

            return matchesStatsTab && matchesSearch && matchesCategory && matchesColor;
        });

        pool.sort((a, b) => {
            const availabilityOrder = compareSoldLast(a, b);
            if (availabilityOrder) return availabilityOrder;
            if (sortBy === 'entry_new') return b.createdAt?.seconds - a.createdAt?.seconds || b.id.localeCompare(a.id);
            if (sortBy === 'entry_old') return a.createdAt?.seconds - b.createdAt?.seconds || a.id.localeCompare(b.id);
            if (sortBy === 'shop_order') return (b.shopOrder || 0) - (a.shopOrder || 0) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            if (sortBy === 'date_made_new') return (new Date(b.creationDate) as any) - (new Date(a.creationDate) as any);
            if (sortBy === 'date_made_old') return (new Date(a.creationDate) as any) - (new Date(b.creationDate) as any);
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'el');
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'el');
            return 0;
        });

        return pool;
    }, [jewelryList, searchQuery, selectedCategory, selectedColor, sortBy, statsFilter]);

    return {
        statsFilter, setStatsFilter, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
        selectedColor, setSelectedColor, sortBy, setSortBy, viewMode, setViewMode, dashboardStats, statsCopy,
        filteredAndSortedJewelry
    };
}

export type CatalogFilters = ReturnType<typeof useCatalogFilters>;
