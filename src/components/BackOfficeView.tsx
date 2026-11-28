import { colorKey, materialKey, uniqueCatalogLabels } from '../lib/catalog-labels';
import { useTouchReorder } from '../lib/use-touch-reorder';
import {
    IconPlus, IconSettings, IconTrash, IconEdit, IconEye, IconX, IconImage, IconGrid, IconList, IconBox,
    IconDownload, IconClone, IconBolt, IconUndo
} from './backoffice/icons';
import { useCatalogHistory } from './backoffice/useCatalogHistory';
import { CatalogHistoryDialog } from './backoffice/CatalogHistoryDialog';
import { useVintedReviews } from './backoffice/useVintedReviews';
import { inventoryLabel, inventoryStock, isSoldItem } from '../lib/stock-edit';
import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { CatalogRecord } from './backoffice/backoffice-types';
import { notifyOperationSuccess } from '../lib/sound-notifications';
import { CatalogExcelExport } from './CatalogExcelExport';
import { FirebaseMediaCleanup } from './FirebaseMediaCleanup';
import { OrdersManager } from './OrdersManager';
import { VintedRefresh } from './VintedRefresh';
import { buildCsv, downloadCsv } from '../lib/csv-export';
import { db, auth, storage } from '../firebase';
import { collection, onSnapshot, setDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { PortfolioManager } from './PortfolioManager';
import { useBackOfficeUploads } from './backoffice/useBackOfficeUploads';
import { useCatalogPreferences } from './backoffice/useCatalogPreferences';
import { useCatalogFilters } from './backoffice/useCatalogFilters';
import { useProductWorkspace } from './backoffice/useProductWorkspace';
import { useShopSettings } from './backoffice/useShopSettings';
import { useCatalogBulk } from './backoffice/useCatalogBulk';
import { useCatalogOptions } from './backoffice/useCatalogOptions';
import { useProductMedia } from './backoffice/useProductMedia';
import { useVintedCatalog } from './backoffice/useVintedCatalog';
import { useMediaStudio } from './backoffice/useMediaStudio';
import { createProductActions } from './backoffice/createProductActions';
import { useProductAi } from './backoffice/useProductAi';
import { BulkEditorDialog } from './backoffice/BulkEditorDialog';
import { ProductEditorDialog } from './backoffice/ProductEditorDialog';
import { MediaStudioDialog } from './backoffice/MediaStudioDialog';
import { ProductDetailDialog } from './backoffice/ProductDetailDialog';
import { ShopSettingsDialog } from './backoffice/ShopSettingsDialog';
import { VintedImportDialog } from './backoffice/VintedImportDialog';

interface BackOfficeViewProps {
  onExit?: () => void;
}

export const BackOfficeView: React.FC<BackOfficeViewProps> = ({ onExit }) => {
    const touchReorder = useTouchReorder((from, to) => {
        const target = jewelryList.find(item => item.id === to);
        if (target) void handleProductDrop({ preventDefault() {}, dataTransfer: { getData: () => from } }, target);
    });
    const [activeCollection, setActiveCollection] = useState<'jewelry' | 'portfolio' | 'orders'>('jewelry');
    const [firebaseReady, setFirebaseReady] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [isAdminClaim, setIsAdminClaim] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [jewelryList, setJewelryList] = useState<CatalogRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [catalogLoadError, setCatalogLoadError] = useState('');
    const [catalogRetryKey, setCatalogRetryKey] = useState(0);

    const [isSaving, setIsSaving] = useState(false);
    const catalogHistory = useCatalogHistory(firebaseReady, currentUser);
    const {
        versionHistory, isHistoryOpen, setIsHistoryOpen, lastAction, redoAction, showUndoToast,
        setShowUndoToast, showRedoToast, setShowRedoToast, pushVersionHistory, pushUndoAction, handleUndo,
        handleRedo
    } = catalogHistory;


    const vintedReviews = useVintedReviews();
    const { vintedReviewsData } = vintedReviews;

    // Keep feature state mounted while catalog tabs and dialogs change.
    const mediaUploads = useBackOfficeUploads();
    const catalogPreferences = useCatalogPreferences();
    const catalogFilters = useCatalogFilters({ activeCollection, jewelryList });
    const productWorkspace = useProductWorkspace({ ...mediaUploads, isSaving });
    const shopSettingsController = useShopSettings({
        ...catalogPreferences, ...mediaUploads, ...catalogHistory, currentUser, firebaseReady
    });
    const catalogBulk = useCatalogBulk({
        ...catalogPreferences, ...catalogFilters, ...catalogHistory, jewelryList
    });
    const catalogOptions = useCatalogOptions({
        ...catalogPreferences, ...productWorkspace, ...shopSettingsController, firebaseReady, jewelryList
    });
    const productMedia = useProductMedia({ ...catalogOptions, ...productWorkspace, ...mediaUploads });
    const vintedCatalog = useVintedCatalog({ ...catalogOptions, ...catalogHistory, currentUser, jewelryList });
    const mediaStudio = useMediaStudio({ ...productWorkspace, ...productMedia });
    const productActions = createProductActions({
        ...productWorkspace, ...catalogPreferences, ...catalogOptions, ...mediaUploads, ...productMedia,
        ...catalogHistory, isSaving, jewelryList, setIsSaving
    });
    const productAi = useProductAi({
        ...catalogOptions, ...productWorkspace, ...shopSettingsController, currentUser
    });
    const { mediaPreparing, setVideoProgress } = mediaUploads;
    const {
        closeItemEditor, formPrivateMediaList, formShopMediaList, isAddOpen, isDetailOpen, setIsDetailOpen
    } = productWorkspace;
    const {
        isSavingSettings, isSettingsOpen, setActiveSettingsTab, setIsSettingsOpen
    } = shopSettingsController;
    const {
        dashboardStats, filteredAndSortedJewelry, searchQuery, selectedCategory, selectedColor, setSearchQuery,
        setSelectedCategory, setSelectedColor, setSortBy, setStatsFilter, setViewMode, sortBy, statsCopy,
        statsFilter, viewMode, archiveView
    } = catalogFilters;
    const { allFilterCategories, allFilterColors, allFormStatuses, getStatusColor } = catalogOptions;
    const { closeImageEditor, imageEditorTarget, isApplyingImageEdit } = mediaStudio;
    const {
        clearBulkSelection, dragOverProductId, draggedProductId, handleBulkArchive, isArchiving, handleBulkDelete, handleBulkDuplicate,
        handleLassoStart, handleMoveShopOrder, handleProductDragEnd, handleProductDragOver,
        handleProductDragStart, handleProductDrop, handleProductSelectionClick, isBulkOpen,
        isShopOrderMoveDisabled, lassoRect, productGridRef, selectItem, selectVisibleItems, selectedItemIds,
        selectedItems, setIsBulkOpen, setSelectedItemIds, visibleItemIds
    } = catalogBulk;
    const {
        handleCloneItem, handleDeleteItem, handleOpenAdd, handleOpenEdit, handleQuickSold, handleViewDetails
    } = productActions;
    const {
        calculateVintedAdjustedPrice, getVintedApis, getVintedSourceUrl, isVintedImportOpen, parseVintedMoney,
        setIsVintedImportOpen, setVintedPreviewImage, vintedPreviewImage, vintedPricingSettings,
        vintedRefreshResult
    } = vintedCatalog;

    useEffect(() => { setVideoProgress(null); }, [isAddOpen, isSettingsOpen]);

    // Global Escape key listener for all modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (imageEditorTarget && !isApplyingImageEdit) { closeImageEditor(); return; }
                if (isDetailOpen) { setIsDetailOpen(false); return; }
                if (isBulkOpen) { setIsBulkOpen(false); return; }
                if (isVintedImportOpen) { setIsVintedImportOpen(false); return; }
                if (isSettingsOpen && !mediaPreparing && !isSavingSettings) { setIsSettingsOpen(false); return; }
                if (isAddOpen && !isSaving && !mediaPreparing) { closeItemEditor(); return; }
                if (isHistoryOpen) { setIsHistoryOpen(false); return; }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAddOpen, isBulkOpen, isSettingsOpen, isDetailOpen, isHistoryOpen, isVintedImportOpen, isSaving, mediaPreparing, isSavingSettings, formShopMediaList, formPrivateMediaList]);

    const stripClientId = (data: CatalogRecord = {}) => {
        const { id, ...docData } = data;
        return docData;
    };

    useEffect(() => {
        const checkFirebase = () => {
            if (db && storage && auth && collection && setDoc && onAuthStateChanged) {
                setFirebaseReady(true);
                const loadingEl = document.getElementById("loading-message"); if (loadingEl) loadingEl.style.display = "none";
            } else {
                setTimeout(checkFirebase, 50);
            }
        };
        checkFirebase();
    }, []);

    useEffect(() => {
        if (!firebaseReady) return;
        let authVersion = 0;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const version = ++authVersion;
            setAuthReady(false);
            setCurrentUser(user || null);
            if (!user) {
                setIsAdminClaim(false);
                setJewelryList([]);
                setIsLoading(false);
                setAuthReady(true);
                return;
            }
            user.getIdTokenResult(true).then((tokenResult) => {
                if (version !== authVersion) return;
                setIsAdminClaim(tokenResult.claims.admin === true ||
                    (tokenResult.claims.email === 'aristeaamnta@gmail.com' && tokenResult.claims.email_verified === true));
            }).catch((error) => {
                if (version !== authVersion) return;
                console.error('Could not verify admin claim:', error);
                setIsAdminClaim(false);
            }).finally(() => {
                if (version === authVersion) setAuthReady(true);
            });
        });
        return () => { authVersion++; unsubscribe(); };
    }, [firebaseReady]);

    useEffect(() => {
        if (!firebaseReady || !currentUser) return;
        setIsLoading(true);
        setCatalogLoadError('');
        const q = query(collection(db, "jewelry"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setJewelryList(fetchedItems);
            setCatalogLoadError('');
            setIsLoading(false);
        }, (error) => {
            console.error('Could not load jewelry catalog:', error);
            setCatalogLoadError(error?.message || 'Δεν ήταν δυνατή η φόρτωση του καταλόγου.');
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [firebaseReady, currentUser, catalogRetryKey]);

    const exportToCSV = () => {
        const headers = ['Όνομα', 'Κατηγορία', 'Συλλογή', 'Κατάσταση πώλησης', 'Απόθεμα', 'Τιμή Πώλησης (€)', 'Κόστος (€)', 'Χρώματα', 'Υλικά', 'Κωδ. Αποθήκευσης', 'Links Αγοράς', 'Πλατφόρμες Ανάρτησης', 'Κεντρική Φωτογραφία'];
        const rows = filteredAndSortedJewelry.map(item => {
            const linksStr = (item.purchaseLinks || item.productLinks || []).map(l => `${l.site}: ${l.url}`).join(' | ');
            const postedStr = (item.postedPlatforms || []).map(p => `${p.site} ${p.url ? `(${p.url})` : ''} - [${p.showInShop ? 'Ορατό' : 'Κρυφό'}]`).join(' | ');
            return [
                item.name || '',
                item.category || '',
                item.collection || '',
                inventoryLabel(item),
                inventoryStock(item),
                item.price || 0,
                item.cost || 0,
                uniqueCatalogLabels(item.colors || [], colorKey).join(', '),
                uniqueCatalogLabels(item.materials || [], materialKey).join(', '),
                item.storage || '',
                linksStr,
                postedStr,
                item.imageUrl || ''
            ];
        });

        const csvString = buildCsv(headers, rows, ';');
        downloadCsv(csvString, `katalogos_aram_creations_${new Date().toISOString().split('T')[0]}.csv`);
        notifyOperationSuccess('Εξαγωγή CSV', `Ο κατάλογος (${filteredAndSortedJewelry.length} προϊόντα) εξήχθη επιτυχώς σε CSV.`);
    };

    const handleAdminLogin = async (event) => {
        event.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        try {
            await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
            setAdminPassword('');
        } catch (err) {
            setLoginError(err.message || 'Login failed.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleAdminSignOut = async () => {
        await signOut(auth);
    };

    const settingsDialog = (
        <ShopSettingsDialog
                {...shopSettingsController}
                {...productAi}
                {...catalogOptions}
                {...catalogPreferences}
                {...mediaUploads}
                vintedReviews={vintedReviews}
                vintedReviewsData={vintedReviewsData}
            />
    );

    if (!firebaseReady || !authReady) return <p role="status" className="p-8 text-center text-stone-600">Φόρτωση διαχείρισης…</p>;

    if (currentUser && !isAdminClaim) {
        return (
            <div className="workspace-login flex items-center justify-center">
                <section role="alert" className="w-full max-w-md bg-white border border-amber-200 rounded-2xl shadow-xl p-6 space-y-3">
                    <h1 className="text-xl font-black text-stone-900">Δεν έχει δοθεί δικαίωμα διαχείρισης</h1>
                    <p className="text-sm text-stone-600">Ο λογαριασμός είναι συνδεδεμένος, αλλά δεν έχει το Firebase admin claim που απαιτείται για το Back Office.</p>
                    <button onClick={handleAdminSignOut} className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold">Αποσύνδεση</button>
                </section>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="workspace-login flex items-center justify-center">
                <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-xl p-6 space-y-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Aram Creations</p>
                        <h1 className="text-2xl font-black text-stone-900 mt-1">Σύνδεση στο Back Office</h1>
                        <p className="text-sm text-stone-500 mt-2">Χρησιμοποίησε τον λογαριασμό διαχείρισης του εργαστηρίου.</p>
                    </div>
                    <label className="block">
                        <span className="text-xs font-bold text-stone-500 uppercase">Email</span>
                        <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="email" required className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-stone-500" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-stone-500 uppercase">Κωδικός πρόσβασης</span>
                        <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="current-password" required className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-stone-500" />
                    </label>
                    {loginError && <div role="alert" className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">{loginError}</div>}
                    <button type="submit" disabled={isLoggingIn} className="w-full px-5 py-3 rounded-xl bg-stone-900 text-white font-black hover:bg-stone-800 disabled:opacity-50 transition">
                        {isLoggingIn ? 'Σύνδεση…' : 'Σύνδεση'}
                    </button>
                </form>
            </div>
        );
    }

    const workspaceNav = (
        <nav className="workspace-nav" aria-label="Ενότητες Back Office">
            <button type="button" aria-current={activeCollection === 'jewelry' ? 'page' : undefined}
                onClick={() => { setActiveCollection('jewelry'); setSelectedCategory('Όλα'); setStatsFilter('all'); }}>Κατάλογος Shop</button>
            <button type="button" aria-current={activeCollection === 'portfolio' ? 'page' : undefined}
                onClick={() => setActiveCollection('portfolio')}>Portfolio</button>
            <button type="button" aria-current={activeCollection === 'orders' ? 'page' : undefined}
                onClick={() => setActiveCollection('orders')}>Παραγγελίες</button>
        </nav>
    );

    if (activeCollection === 'orders') {
        return <>{workspaceNav}<OrdersManager onBack={() => setActiveCollection('jewelry')} /></>;
    }
    if (activeCollection === 'portfolio') {
        return (
            <>
                {workspaceNav}
                <PortfolioManager
                history={versionHistory}
                onBack={() => setActiveCollection('jewelry')}
                onNavigateOrders={() => setActiveCollection('orders')}
                onOpenSettings={() => { setIsSettingsOpen(true); setActiveSettingsTab('portfolio'); }}
                currentUser={currentUser}
                onSignOut={handleAdminSignOut}
            />
                {settingsDialog}
                </>
        );
    }

    return (
        <>{workspaceNav}<div className="backoffice-view min-h-screen p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20 relative">

            <h1 className="workspace-heading">Κατάλογος Shop</h1>
            <header className="backoffice-toolbar flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="backoffice-actions flex flex-col gap-3 w-full lg:w-auto">
                    <div className="backoffice-primary-actions flex flex-wrap items-center justify-start lg:justify-end gap-3">
                        <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-bold transition shadow-md">
                            <IconPlus /> Νέα Καταχώρηση
                        </button>
                        <button onClick={() => setIsVintedImportOpen(true)} className="flex items-center gap-2 border border-stone-300 px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-900 rounded-lg text-sm font-semibold transition" title="Εισαγωγή προϊόντων από συνδέσμους Vinted">
                            Εισαγωγή από Vinted
                        </button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs font-bold min-w-0">
                            <span className="max-w-[190px] truncate">{currentUser.email}</span>
                            <button onClick={handleAdminSignOut} className="text-emerald-900 underline underline-offset-2 whitespace-nowrap">Αποσύνδεση</button>
                        </div>
                    </div>
                    <div className="backoffice-utility-actions flex flex-wrap items-center justify-start lg:justify-end gap-2 pt-3 border-t border-stone-100">
                        <button onClick={handleUndo} disabled={!lastAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Αναίρεση τελευταίας ενέργειας">
                            <IconUndo /> <span className="ml-2">Αναίρεση</span>
                        </button>
                        <button onClick={handleRedo} disabled={!redoAction} className="flex items-center justify-center px-3 py-2 bg-stone-100 disabled:opacity-40 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Επαναφορά τελευταίας αναίρεσης">
                            Επανάληψη
                        </button>
                        <button onClick={() => setIsHistoryOpen(true)} className="flex items-center justify-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition font-bold text-xs" title="Ιστορικό εκδόσεων">
                            Ιστορικό
                        </button>
                        <FirebaseMediaCleanup />
                        <CatalogExcelExport />
                        <button onClick={exportToCSV} className="flex items-center justify-center px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs" title="Εξαγωγή επιλεγμένης προβολής και φίλτρων σε CSV">
                            <IconDownload /> <span className="ml-2">CSV</span>
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition" title="Διαχείριση Συστήματος & Εμφάνισης Shop">
                            <IconSettings />
                        </button>
                    </div>
                </div>
            </header>

            <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-end mb-3 px-1 min-w-0">
                    <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">Προβολή καταλόγου</h3>
                    <div role="group" aria-label="Προβολή καταλόγου" className="backoffice-stats-filter flex flex-wrap bg-stone-200/70 rounded-lg p-1 max-w-full">
                        {([
                            ['all', 'Όλα στο Shop'],
                            ['available', 'Προς πώληση'],
                            ['unavailable', 'Μη διαθέσιμα'],
                            ['sold', 'Πωλημένα'],
                            ['archived', 'Αρχείο'],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={statsFilter === value}
                                disabled={isArchiving}
                                onClick={() => {
                                    if ((statsFilter === 'archived') !== (value === 'archived')) clearBulkSelection();
                                    setStatsFilter(value);
                                }}
                                className={`text-xs font-bold px-4 py-1.5 rounded-md transition whitespace-nowrap disabled:opacity-50 ${statsFilter === value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {archiveView !== 'archived' && <div className="backoffice-stats-grid grid grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.count}</span>
                        <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.count}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.value}</span>
                        <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.value.toFixed(2)}€</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{statsCopy.profit}</span>
                        <span className="text-xl sm:text-2xl font-black text-stone-950">{dashboardStats.profit.toFixed(2)}€</span>
                    </div>
                </div>}
            </div>

            <div className="mb-6">
              <CatalogControls label="Φίλτρα Back Office Shop" search={searchQuery} onSearch={setSearchQuery}
                placeholder="Αναζήτηση (όνομα, συλλογή, υλικό, χρώμα)..."
                categories={[{ id: 'Όλα', label: 'Όλες οι Κατηγορίες' }, ...allFilterCategories.map(category => ({ id: category, label: category }))]}
                selectedCategory={selectedCategory} onCategory={setSelectedCategory}
                actions={<>
                <select aria-label="Φίλτρο χρώματος" className="px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-stone-400 text-sm" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                    <option value="Όλα">Όλα τα Χρώματα</option>
                    {allFilterColors.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <select aria-label="Ταξινόμηση προϊόντων" className="px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-stone-400 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="entry_new">Νεότερα</option>
                    <option value="entry_old">Παλαιότερα</option>
                    <option value="shop_order">Σειρά Shop</option>
                    <option value="date_made_new">Ημ. Κατασκευής (Νεότερα)</option>
                    <option value="date_made_old">Ημ. Κατασκευής (Παλαιότερα)</option>
                    <option value="name_asc">Όνομα (Α-Ω)</option>
                    <option value="name_desc">Όνομα (Ω-Α)</option>
                </select>
                <div role="group" aria-label="Διάταξη καταλόγου" className="flex border border-stone-200 rounded-lg overflow-hidden md:ml-auto">
                    <button type="button" aria-label="Πλέγμα" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} className={`p-2 transition ${viewMode === 'grid' ? 'bg-stone-200 text-stone-800' : 'bg-white text-stone-400 hover:text-stone-600'}`}><IconGrid /></button>
                    <button type="button" aria-label="Λίστα" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={`p-2 transition ${viewMode === 'list' ? 'bg-stone-200 text-stone-800' : 'bg-white text-stone-400 hover:text-stone-600'}`}><IconList /></button>
                </div>
                </>} />
            </div>

            <div className="mb-6 bg-white border border-stone-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-stone-300" checked={visibleItemIds.length > 0 && visibleItemIds.every(id => selectedItemIds.includes(id))} onChange={(e) => e.target.checked ? selectVisibleItems() : setSelectedItemIds(prev => prev.filter(id => !visibleItemIds.includes(id)))} />
                        Επιλογή ορατών
                    </label>
                    <span className="text-xs text-stone-400 font-bold">{selectedItemIds.length} επιλεγμένα</span>
                    <span className="text-[11px] text-stone-500">Shift + κλικ: συνεχόμενη επιλογή · σύρε σε κενό χώρο: επιλογή με πλαίσιο</span>
                </div>
                {selectedItemIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={isArchiving} onClick={() => handleBulkArchive(archiveView === 'active')} className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-bold disabled:opacity-50">
                            {isArchiving ? 'Ενημέρωση…' : archiveView === 'active' ? 'Αρχειοθέτηση' : 'Επαναφορά στο Shop'}
                        </button>
                        {archiveView === 'active' && <>
                        <VintedRefresh statuses={allFormStatuses} items={selectedItems} sourceUrl={getVintedSourceUrl} endpoint={getVintedApis().link} pricing={(basePrice) => ({
                            vintedBasePrice: basePrice,
                            buyerFixed: parseVintedMoney(vintedPricingSettings.buyerFixed),
                            buyerPercent: parseVintedMoney(vintedPricingSettings.buyerPercent),
                            shippingMin: parseVintedMoney(vintedPricingSettings.shippingMin),
                            estimatedTotal: basePrice + parseVintedMoney(vintedPricingSettings.buyerFixed) + basePrice * parseVintedMoney(vintedPricingSettings.buyerPercent) / 100 + parseVintedMoney(vintedPricingSettings.shippingMin),
                            sitePrice: calculateVintedAdjustedPrice(basePrice),
                            rounding: vintedPricingSettings.rounding,
                            parcelProfile: 'small_parcel_gr'
                        })} />
                        <button onClick={() => setIsBulkOpen(true)} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition">Μαζική επεξεργασία</button>
                        <button onClick={handleBulkDuplicate} className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-200 transition">Αντιγραφή</button>
                        </>}
                        <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition">Διαγραφή</button>
                        <button onClick={clearBulkSelection} className="px-4 py-2 bg-white border border-stone-200 text-stone-500 rounded-lg text-xs font-bold hover:bg-stone-50 transition">Καθαρισμός</button>
                    </div>
                )}
            </div>
            {vintedRefreshResult && (
                <div role={vintedRefreshResult.error ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-4 py-3 text-xs font-bold ${vintedRefreshResult.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    {vintedRefreshResult.message}
                </div>
            )}

            {isLoading ? (
                <div className="text-center p-20 font-medium text-stone-400">Φόρτωση δεδομένων από το Cloud...</div>
            ) : catalogLoadError ? (
                <div role="alert" className="text-center p-10 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                    <p className="font-bold">Δεν φορτώθηκε ο κατάλογος.</p>
                    <p className="text-sm mt-1">{catalogLoadError}</p>
                    <button onClick={() => setCatalogRetryKey((key) => key + 1)} className="mt-4 px-4 py-2 rounded-lg bg-rose-700 text-white text-sm font-bold hover:bg-rose-800">
                        Δοκιμή ξανά
                    </button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' && (
                        <div ref={productGridRef} onPointerDown={handleLassoStart} className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 select-none p-3 sm:p-4 bg-stone-50/50 rounded-2xl border border-stone-200/60">
                            {lassoRect && <div aria-hidden="true" className="pointer-events-none fixed z-[9999] border-2 border-emerald-500 bg-emerald-400/20 rounded shadow-sm" style={{ left: `${lassoRect.left}px`, top: `${lassoRect.top}px`, width: `${lassoRect.width}px`, height: `${lassoRect.height}px` }} />}
                            {filteredAndSortedJewelry.map((item) => {
                                const isSold = isSoldItem(item);
                                const stock = inventoryStock(item);
                                const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                return (
                                <div
                                    key={item.id}
                                    data-product-id={item.id}
                                    {...touchReorder(item.id)}
                                    draggable
                                    onClick={(event) => handleProductSelectionClick(event, item.id)}
                                    onDragStart={(event) => handleProductDragStart(event, item)}
                                    onDragOver={(event) => handleProductDragOver(event, item)}
                                    onDrop={(event) => handleProductDrop(event, item)}
                                    onDragEnd={handleProductDragEnd}
                                    className={`group bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                >
                                    <button type="button" data-reorder-handle style={{ touchAction: 'none' }} onClick={event => event.stopPropagation()} className="min-h-11 px-3 text-xs font-bold cursor-grab bg-stone-100" aria-label={`Μετακίνηση ${item.name}`}>⠿ Σύρε για αλλαγή σειράς</button>
                                    <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                                        <label onClick={(e) => e.stopPropagation()} className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg p-1 shadow-sm cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer" checked={selectedItemIds.includes(item.id)} onClick={(event) => { event.stopPropagation(); selectItem(item.id, event.shiftKey); }} onChange={() => {}} />
                                        </label>
                                        {item.imageUrl ? (
                                            item.fileType === 'video' ? (
                                                <video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted loop autoPlay playsInline />
                                            ) : (
                                                <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
                                            )
                                        ) : <IconImage />}

                                        {item.mediaList && item.mediaList.length > 1 && (
                                            <div className="absolute top-2 right-2 bg-stone-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                {item.mediaList.length} αρχεία
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο πάνω στο Shop">↑</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="bg-white/95 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow" title="Πιο κάτω στο Shop">↓</button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">Σύρε</div>

                                        {stock > 1 && !isSold && (
                                            <div className="absolute top-10 left-2 bg-stone-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1">
                                                <IconBox /> Απόθεμα: {stock}
                                            </div>
                                        )}
                                        {isSold && (
                                            <div className="absolute inset-0 bg-white/35 flex items-center justify-center">
                                                <span className="bg-stone-900/80 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Μη διαθέσιμο</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{item.category}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(inventoryLabel(item))}`}>
                                                {inventoryLabel(item)}
                                            </span>
                                        </div>
                                        <h3 className={`font-bold text-lg leading-tight mb-1 ${isSold ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                                        {item.collection && <p className="text-xs text-stone-500 italic mb-2">{item.collection}</p>}

                                        <div className="flex flex-wrap gap-1 mb-4 mt-auto pt-2">
                                            {uniqueCatalogLabels(item.colors || [], colorKey).slice(0, 2).map((col, i) => <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-bold">{col}</span>)}
                                            {uniqueCatalogLabels(item.materials || [], materialKey).slice(0, 2).map((mat, i) => <span key={i} className="text-[10px] bg-stone-50 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">{mat}</span>)}
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                                            <span className={`font-bold ${isSold ? 'text-stone-400' : 'text-stone-900'}`}>{item.price ? `${item.price}€` : '-'}</span>
                                            <div className="flex gap-1">
                                                {archiveView === 'active' && !isSold && (
                                                    <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                                )}
                                                <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                                <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                                <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                                <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div onPointerDown={handleLassoStart} className="flex flex-col gap-3 p-3 sm:p-4 bg-stone-50/50 rounded-2xl border border-stone-200/60 select-none">
                            {filteredAndSortedJewelry.map((item) => {
                                const isSold = isSoldItem(item);
                                const stock = inventoryStock(item);
                                const isBulkDragged = draggedProductId && selectedItemIds.includes(draggedProductId) && selectedItemIds.includes(item.id);
                                return (
                                <div
                                    key={item.id}
                                    data-product-id={item.id}
                                    {...touchReorder(item.id)}
                                    draggable
                                    onClick={(event) => handleProductSelectionClick(event, item.id)}
                                    onDragStart={(event) => handleProductDragStart(event, item)}
                                    onDragOver={(event) => handleProductDragOver(event, item)}
                                    onDrop={(event) => handleProductDrop(event, item)}
                                    onDragEnd={handleProductDragEnd}
                                    className={`flex flex-col md:flex-row items-start md:items-center p-3 bg-white border rounded-xl shadow-sm gap-4 transition hover:bg-stone-50 cursor-grab active:cursor-grabbing ${selectedItemIds.includes(item.id) ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'} ${dragOverProductId === item.id ? 'ring-2 ring-amber-400 border-amber-300 shadow-lg' : ''} ${draggedProductId === item.id || isBulkDragged ? 'opacity-60 scale-[0.99]' : ''} ${isSold ? 'opacity-80' : ''}`}
                                >
                                    <button type="button" data-reorder-handle style={{ touchAction: 'none' }} onClick={event => event.stopPropagation()} className="min-h-11 px-3 text-xs font-bold cursor-grab bg-stone-100" aria-label={`Μετακίνηση ${item.name}`}>⠿ Σύρε για αλλαγή σειράς</button>
                                    <div className="hidden md:flex h-10 w-6 items-center justify-center text-stone-300 font-black select-none">::</div>
                                    <label onClick={(e) => e.stopPropagation()} className="flex items-center justify-center p-2 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer" checked={selectedItemIds.includes(item.id)} onClick={(event) => { event.stopPropagation(); selectItem(item.id, event.shiftKey); }} onChange={() => {}} />
                                    </label>
                                    <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 relative">
                                        {item.imageUrl ? (
                                            item.fileType === 'video' ? (
                                                <video src={item.imageUrl} referrerPolicy="no-referrer" className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} muted />
                                            ) : (
                                                <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} className={`w-full h-full object-cover ${isSold ? 'grayscale' : ''}`} alt={item.name} />
                                            )
                                        ) : <IconImage />}
                                        {stock > 1 && !isSold && <div className="absolute bottom-0 right-0 bg-stone-900 text-white text-[9px] px-1 font-bold rounded-tl">{stock}x</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold truncate ${isSold ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(inventoryLabel(item))}`}>{inventoryLabel(item)}</span>
                                            <span className="text-xs font-bold text-stone-500 uppercase">{item.category}</span>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-wrap gap-1 flex-1">
                                        {uniqueCatalogLabels(item.colors || [], colorKey).slice(0, 1).map((col, i) => <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-1 rounded border border-indigo-100 uppercase font-bold">{col}</span>)}
                                        {uniqueCatalogLabels(item.materials || [], materialKey).slice(0, 1).map((mat, i) => <span key={i} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-1 rounded border border-stone-200">{mat}</span>)}
                                        {item.storage && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">{item.storage}</span>}
                                    </div>
                                    <div className={`font-bold md:w-20 md:text-right ${isSold ? 'text-stone-400' : 'text-stone-900'}`}>
                                        {item.price ? `${item.price}€` : '-'}
                                    </div>
                                    <div className="flex gap-1 mt-3 md:mt-0 w-full md:w-auto justify-end border-t border-stone-100 md:border-none pt-3 md:pt-0">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'up'); }} disabled={isShopOrderMoveDisabled(item, 'up')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο πάνω στο Shop">↑</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveShopOrder(item, 'down'); }} disabled={isShopOrderMoveDisabled(item, 'down')} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-amber-700 disabled:text-stone-300 hover:bg-amber-50 rounded-lg transition" title="Πιο κάτω στο Shop">↓</button>
                                        {archiveView === 'active' && !isSold && (
                                            <button type="button" onClick={(e) => handleQuickSold(e, item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Γρήγορη Πώληση"><IconBolt /></button>
                                        )}
                                        <button type="button" onClick={() => handleCloneItem(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Αντιγραφή"><IconClone /></button>
                                        <button type="button" onClick={() => handleViewDetails(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Προβολή"><IconEye /></button>
                                        <button type="button" onClick={() => handleOpenEdit(item)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-lg transition" title="Επεξεργασία"><IconEdit /></button>
                                        <button type="button" onClick={() => handleDeleteItem(item.id, item.mediaList, item.imageUrl)} className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition" title="Διαγραφή"><IconTrash /></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </>
            )}

            <BulkEditorDialog
                {...catalogOptions}
                {...catalogBulk}
            />

            <ProductEditorDialog
                {...productWorkspace}
                {...productAi}
                {...catalogOptions}
                {...mediaStudio}
                {...productMedia}
                {...productActions}
                {...mediaUploads}
                isSaving={isSaving}
            />

            <MediaStudioDialog
                {...mediaStudio}
            />

            <ProductDetailDialog
                {...productWorkspace}
                {...catalogOptions}
                {...productActions}
            />

            {/* ΝΕΟ SETTINGS PANEL ΜΕ ΚΑΡΤΕΛΕΣ (Shop Design) */}
            {settingsDialog}

<VintedImportDialog
    {...vintedCatalog}
/>

            {vintedPreviewImage && (
                <ImageLightbox images={vintedPreviewImage.images} index={vintedPreviewImage.index} title={vintedPreviewImage.title}
                    onIndexChange={index => setVintedPreviewImage(previous => previous && ({ ...previous, index }))}
                    onClose={() => setVintedPreviewImage(null)} />
            )}

            <CatalogHistoryDialog {...catalogHistory} />

{showUndoToast && lastAction && (
                <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in border border-stone-700">
                    <span className="text-sm font-medium">{lastAction.message}</span>
                    <button onClick={handleUndo} className="text-emerald-400 font-bold text-sm hover:underline flex items-center gap-1"><IconUndo /> Αναίρεση</button>
                    <button onClick={() => setShowUndoToast(false)} className="text-stone-400 hover:text-white ml-2"><IconX /></button>
                </div>
            )}
            {showRedoToast && redoAction && (
                <div className="fixed bottom-4 right-4 bg-white text-stone-800 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in border border-stone-200">
                    <span className="text-sm font-medium">Η ενέργεια αναιρέθηκε.</span>
                    <button onClick={handleRedo} className="text-stone-900 font-bold text-sm hover:underline">Επαναφορά</button>
                    <button onClick={() => setShowRedoToast(false)} className="text-stone-400 hover:text-stone-800 ml-2"><IconX /></button>
                </div>
            )}
</div></>
    );
}
