import { ArtistProfileEditor } from '../ArtistProfile';
import { useDialogKeyboard } from '../../lib/use-dialog-keyboard';
import { HeroAppearanceSettings } from '../HeroAppearanceSettings';
import { IconSettings, IconX, IconBolt, IconGripVertical, IconCheck } from './icons';
import { VintedReviewsSettings } from './VintedReviewsSettings';
import { PortfolioDesignSettings } from '../PortfolioDesignSettings';
import { DesignStudioSettings } from '../DesignStudioSettings';
import { CollectionHero } from '../content/CollectionHero';
import {
    portfolioHeroVideoUrl, isKnownUnplayableHevcHeroUrl, TRANSCODED_HERO_H264_PATH
} from '../PortfolioHero';
import { Check, X } from 'lucide-react';
import { MediaDownload } from '../MediaDownload';
import { VideoUploadStatus } from '../VideoUploadStatus';
import { VIDEO_UPLOAD_HELP } from '../../lib/video-policy';
import { VIDEO_FILE_ACCEPT } from '../../lib/media-validation';
import type { ShopSettingsController } from './useShopSettings';
import type { ProductAi } from './useProductAi';
import type { CatalogOptions } from './useCatalogOptions';
import type { CatalogPreferences } from './useCatalogPreferences';
import type { BackOfficeUploads } from './useBackOfficeUploads';
import type { BackOfficeSharedState } from './backoffice-types';

type ShopSettingsDialogProps = Pick<
    ShopSettingsController,
    'activeFieldFilter' | 'activeSettingsTab' | 'draggedCategoryIdx' | 'handleHeroVideoUpload' |
    'handleSaveSettings' | 'heroUploadStatus' | 'isSavingSettings' | 'isSettingsOpen' |
    'portfolioHeroUploadStatus' | 'setActiveFieldFilter' | 'setActiveSettingsTab' | 'setDraggedCategoryIdx' |
    'setHeroUploadStatus' | 'setIsSettingsOpen' | 'setPortfolioHeroUploadStatus' | 'setSettingsSuccessMessage' |
    'setShopSettings' | 'settingsLoaded' | 'settingsLoadError' | 'settingsSuccessMessage' | 'shopSettings' |
    'updateAssistantSetting'
> &
    Pick<ProductAi, 'assistantSettings'> &
    Pick<
    CatalogOptions,
    'categoryUsageCounts' | 'collectionUsageCounts' | 'colorUsageCounts' | 'materialUsageCounts' |
    'platformUsageCounts' | 'renderFieldOptionManager' | 'settingsCategoryOptions' |
    'settingsCollectionOptions' | 'settingsColorOptions' | 'settingsMaterialOptions' |
    'settingsPlatformOptions' | 'settingsStatusOptions' | 'statusUsageCounts'
> &
    Pick<
    CatalogPreferences,
    'hiddenCategoryOptions' | 'hiddenCollectionOptions' | 'hiddenColorOptions' | 'hiddenMaterialOptions' |
    'hiddenPlatformOptions' | 'hiddenStatusOptions'
> &
    Pick<BackOfficeUploads, 'mediaPreparing' | 'videoAbort' | 'videoCompressing' | 'videoProgress'> &
    Pick<BackOfficeSharedState, 'vintedReviews' | 'vintedReviewsData'>;

export function ShopSettingsDialog(props: ShopSettingsDialogProps) {
    const {
        activeFieldFilter, activeSettingsTab, assistantSettings, categoryUsageCounts, collectionUsageCounts,
        colorUsageCounts, draggedCategoryIdx, handleHeroVideoUpload, handleSaveSettings, heroUploadStatus,
        hiddenCategoryOptions, hiddenCollectionOptions, hiddenColorOptions, hiddenMaterialOptions,
        hiddenPlatformOptions, hiddenStatusOptions, isSavingSettings, isSettingsOpen, materialUsageCounts,
        mediaPreparing, platformUsageCounts, portfolioHeroUploadStatus, renderFieldOptionManager,
        setActiveFieldFilter, setActiveSettingsTab, setDraggedCategoryIdx, setHeroUploadStatus,
        setIsSettingsOpen, setPortfolioHeroUploadStatus, setSettingsSuccessMessage, setShopSettings,
        settingsCategoryOptions, settingsCollectionOptions, settingsColorOptions, settingsLoaded, settingsLoadError,
        settingsMaterialOptions, settingsPlatformOptions, settingsStatusOptions, settingsSuccessMessage,
        shopSettings, statusUsageCounts, updateAssistantSetting, videoAbort, videoCompressing, videoProgress,
        vintedReviews, vintedReviewsData
    } = props;
    const dialog = useDialogKeyboard(isSettingsOpen, () => {
        if (!mediaPreparing && !isSavingSettings) setIsSettingsOpen(false);
    });
    if (!isSettingsOpen) return null;

    return (
        <div
            ref={dialog} role="dialog" aria-modal="true" aria-labelledby="shop-settings-title" tabIndex={-1}
            onClick={(e) => {
                if (e.target === e.currentTarget && !mediaPreparing && !isSavingSettings) {
                    setIsSettingsOpen(false);
                }
            }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="studio-dialog bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-stone-200 cursor-default animate-fade-in"
            >
                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-sm">
                            <IconSettings />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="shop-settings-title" className="text-lg font-semibold text-stone-900 leading-tight">Διαχείριση Συστήματος & Εμφάνισης</h2>
                                <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Aram Admin</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">Ενιαίο Design Studio, περιεχόμενο Shop, Portfolio, προτάσεις πεδίων και AI Back Office.</p>
                        </div>
                    </div>
                    <button
                        disabled={mediaPreparing || isSavingSettings}
                        onClick={() => setIsSettingsOpen(false)}
                        className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-xl border border-stone-200 disabled:opacity-40 transition shadow-sm"
                        title="Κλείσιμο (Esc)"
                    >
                        <IconX />
                    </button>
                </div>

                <div role="group" aria-label="Καρτέλες ρυθμίσεων" className="flex flex-wrap border-b border-stone-200 bg-stone-50 px-4 pt-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('design')}
                        aria-pressed={activeSettingsTab === 'design'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'design'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>Design Studio</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'design' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>Όλο το Site</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('shop')}
                        aria-pressed={activeSettingsTab === 'shop'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'shop'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>Βιτρίνα Shop</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'shop' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>Σελίδα Shop</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('portfolio')}
                        aria-pressed={activeSettingsTab === 'portfolio'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'portfolio'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>Portfolio</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'portfolio' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>Σελίδα Έργων</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('fields')}
                        aria-pressed={activeSettingsTab === 'fields'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'fields'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>Προσαρμοσμένα Πεδία</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'fields' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>Φόρμες</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('assistant')}
                        aria-pressed={activeSettingsTab === 'assistant'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'assistant'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>AI Back Office</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'assistant' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>Βοηθός AI</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSettingsTab('reviews')}
                        aria-pressed={activeSettingsTab === 'reviews'}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition flex items-center gap-2 ${
                            activeSettingsTab === 'reviews'
                                ? 'bg-white text-stone-900 border-t-2 border-stone-900 border-x border-stone-200 shadow-xs'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                    >
                        <span>Αξιολογήσεις Vinted</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            activeSettingsTab === 'reviews' ? 'bg-stone-900 text-white' : 'bg-stone-200/70 text-stone-600'
                        }`}>{vintedReviewsData.stats.feedbackCount ?? 10} Κριτικές</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {settingsSuccessMessage && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs"><Check className="w-3 h-3 stroke-[2.5]" /></span>
                                <span>{settingsSuccessMessage}</span>
                            </div>
                            <button onClick={() => setSettingsSuccessMessage(null)} aria-label="Κλείσιμο" className="text-emerald-600 hover:text-emerald-900 font-bold text-xs p-1"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    )}

                    {settingsLoadError && (
                        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800">
                            Δεν ήταν δυνατή η φόρτωση των κοινών ρυθμίσεων. {settingsLoadError}
                        </div>
                    )}

                    {!settingsLoaded && !settingsLoadError && <p role="status" className="text-sm text-stone-600">Φόρτωση κοινών ρυθμίσεων…</p>}
                    <fieldset disabled={!settingsLoaded || isSavingSettings} className="min-w-0 border-0 p-0">
                    {activeSettingsTab === 'design' && (
                        <DesignStudioSettings value={shopSettings.designStudio} theme={shopSettings.visualTheme}
                            onThemeChange={visualTheme => setShopSettings(prev => ({ ...prev, visualTheme }))}
                            onChange={value => setShopSettings(prev => ({ ...prev, designStudio: value }))} />
                    )}

                    {activeSettingsTab === 'shop' && (
                        <div className="animate-fade-in space-y-6">
                            <HeroAppearanceSettings value={shopSettings.heroAppearance} onChange={value => setShopSettings(prev => ({ ...prev, heroAppearance: value }))} />
                            <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">Περιεχόμενο & Hero Βιτρίνας Shop</h3>
                                    </div>
                                    <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
                                        Οι ρυθμίσεις αυτής της καρτέλας αφορούν αποκλειστικά τη δημόσια σελίδα του καταστήματος (<strong>#shop</strong>): τον κεντρικό τίτλο, το βίντεο καλωσορίσματος, την ανακοίνωση κορυφής και τη σειρά των κατηγοριών.
                                    </p>
                                </div>
                                <span className="text-[10px] font-black bg-emerald-200/80 text-emerald-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το #shop</span>
                            </div>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                <div className="border-b border-stone-100 pb-3">
                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">1. Κεντρικός Τίτλος & Υπότιτλος Hero</h3>
                                    <p className="text-xs text-stone-500 mt-0.5">Το κείμενο που υποδέχεται τους επισκέπτες στην κορυφή του καταστήματος. Ο υπότιτλος εμφανίζεται όταν συμπληρωθεί.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label htmlFor="shop-hero-title-input" className="block text-xs font-bold text-stone-700 mb-1">Κεντρικός Τίτλος Shop</label>
                                        <input
                                            type="text"
                                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-sm font-bold text-stone-900"
                                            id="shop-hero-title-input" value={shopSettings.heroTitle}
                                            onChange={e => setShopSettings({ ...shopSettings, heroTitle: e.target.value })}
                                            placeholder="π.χ. Χειροποίητα Κοσμήματα με Ψυχή"
                                        />
                                    </div>

                                </div>
                                <div>
                                    <label htmlFor="shop-hero-description-input" className="block text-xs font-bold text-stone-700 mb-1">Υπότιτλος / Περιγραφή Shop</label>
                                    <textarea
                                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-xs text-stone-700 h-20 resize-none leading-relaxed"
                                        id="shop-hero-description-input" value={shopSettings.heroSubtitle}
                                        onChange={e => setShopSettings({ ...shopSettings, heroSubtitle: e.target.value })}
                                        placeholder="Σύντομη περιγραφή του εργαστηρίου που εμφανίζεται κάτω από τον τίτλο..."
                                    />
                                </div>
                            </section>

                            <details className="overflow-hidden rounded-xl border border-stone-200">
                                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Προεπισκόπηση βιτρίνας Shop</summary>
                                <CollectionHero preview collection="shop" key={shopSettings.heroVideoUrl}
                                    title={shopSettings.heroTitle.trim() || 'Χειροποίητα κοσμήματα'}
                                    description={shopSettings.heroSubtitle.trim()} appearance={shopSettings.heroAppearance}
                                    videoUrl={portfolioHeroVideoUrl(shopSettings.heroVideoUrl)} />
                            </details>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">2. Βίντεο Hero Shop</h3>
                                        <p className="text-xs text-stone-500 mt-0.5">Εμφανίζεται ως ατμοσφαιρικό βίντεο φόντου στην κορυφή του καταστήματος.</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md">Αυτόματη επανάληψη (Muted)</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-700 mb-1">Σύνδεσμος αρχείου βίντεο (Direct URL)</label>
                                        <input
                                            aria-label="Σύνδεσμος αρχείου βίντεο Hero Shop"
                                            type="url"
                                            placeholder="https://.../video.mp4"
                                            value={shopSettings.heroVideoUrl || ''}
                                            onChange={e => setShopSettings(prev => ({ ...prev, heroVideoUrl: e.target.value }))}
                                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1">Απευθείας σύνδεσμος MP4 / WebM ή σύνδεσμος αποθήκευσης Firebase.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-700 mb-1">Ανέβασμα νέου βίντεο από υπολογιστή</label>
                                        <input
                                            type="file"
                                            accept={VIDEO_FILE_ACCEPT}
                                            disabled={mediaPreparing}
                                            aria-label="Ανέβασμα βίντεο Hero"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                e.target.value = '';
                                                if (file) handleHeroVideoUpload(file, 'shop');
                                            }}
                                            className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1">{VIDEO_UPLOAD_HELP}</p>
                                    </div>
                                </div>

                                <VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />
                                {heroUploadStatus && <p role="status" className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{heroUploadStatus}</p>}

                                {shopSettings.heroVideoUrl && (
                                    <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4">
                                        <video src={portfolioHeroVideoUrl(shopSettings.heroVideoUrl)} controls muted preload="metadata" referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <MediaDownload media={{ url: portfolioHeroVideoUrl(shopSettings.heroVideoUrl), type: 'video' }} name="aram-hero-video" />
                                            {isKnownUnplayableHevcHeroUrl(shopSettings.heroVideoUrl) && (
                                                <button
                                                    type="button"
                                                    disabled={mediaPreparing || isSavingSettings}
                                                    onClick={async () => {
                                                        const res = await fetch(TRANSCODED_HERO_H264_PATH);
                                                        const blob = await res.blob();
                                                        const h264File = new File([blob], '2026-11-04-145207521-h264.mp4', { type: 'video/mp4' });
                                                        await handleHeroVideoUpload(h264File, 'shop');
                                                    }}
                                                    className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold transition"
                                                >
                                                    Αποθήκευση H.264 στο Cloud
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={mediaPreparing || isSavingSettings}
                                                onClick={() => {
                                                    setShopSettings(prev => ({ ...prev, heroVideoUrl: '' }));
                                                    setHeroUploadStatus('Το βίντεο αφαιρέθηκε. Πατήστε Αποθήκευση Ρυθμίσεων για να εφαρμοστεί.');
                                                }}
                                                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition"
                                            >
                                                Αφαίρεση βίντεο
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">3. Ανακοίνωση Κορυφής</h3>
                                            <p className="text-xs text-stone-500 mt-0.5">Μπάρα ενημέρωσης πάνω από το κεντρικό μενού.</p>
                                        </div>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input
                                                aria-label="Ενεργοποίηση ανακοίνωσης κορυφής"
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={shopSettings.announcementEnabled}
                                                onChange={e => setShopSettings({ ...shopSettings, announcementEnabled: e.target.checked })}
                                            />
                                            <span className="relative w-11 h-6 bg-stone-200 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5 shadow-2xs"></span>
                                        </label>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-700 mb-1">Κείμενο ανακοίνωσης</label>
                                            <input
                                                aria-label="Κείμενο ανακοίνωσης κορυφής"
                                                type="text"
                                                maxLength={"140" as unknown as number}
                                                placeholder="π.χ. Δωρεάν μεταφορικά για παραγγελίες άνω των 50€!"
                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                value={shopSettings.announcementText}
                                                onChange={e => setShopSettings({ ...shopSettings, announcementText: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-700 mb-1">Προαιρετικός σύνδεσμος</label>
                                            <input
                                                aria-label="Προαιρετικός σύνδεσμος ανακοίνωσης κορυφής"
                                                type="url"
                                                placeholder="https://..."
                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                value={shopSettings.announcementLink}
                                                onChange={e => setShopSettings({ ...shopSettings, announcementLink: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                    <div className="border-b border-stone-100 pb-3">
                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">4. Πυκνότητα Προϊόντων</h3>
                                        <p className="text-xs text-stone-500 mt-0.5">Καθορίζει τον αέρα και την απόσταση ανάμεσα στις κάρτες προϊόντων.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        {[
                                            ['comfortable', 'Άνετη (Comfortable)', 'Περισσότερος αέρας ανάμεσα στις κάρτες'],
                                            ['compact', 'Πυκνή (Compact)', 'Πιο συμπαγής διάταξη, ιδανική για πολλά προϊόντα']
                                        ].map(([value, label, desc]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setShopSettings(prev => ({ ...prev, catalogDensity: value }))}
                                                className={`p-3 border rounded-xl text-left transition ${
                                                    shopSettings.catalogDensity === value
                                                        ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                                                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-white'
                                                }`}
                                            >
                                                <span className="block text-xs font-black">{label}</span>
                                                <span className="block text-[10px] mt-0.5 opacity-75">{desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                <div className="border-b border-stone-100 pb-3">
                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">5. Σειρά Κατηγοριών στο Μενού Shop</h3>
                                    <p className="text-xs text-stone-500 mt-0.5">Σύρετε τις κατηγορίες για να αλλάξετε τη σειρά που εμφανίζονται στο μενού πλοήγησης. (Η επιλογή «Όλη η Συλλογή» παραμένει πάντα πρώτη).</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                    {shopSettings.categoryOrder.map((cat, idx) => (
                                        <div
                                            key={cat}
                                            draggable
                                            onDragStart={(e) => { setDraggedCategoryIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (draggedCategoryIdx === null || draggedCategoryIdx === idx) return;
                                                const newOrder = [...shopSettings.categoryOrder];
                                                const itemToMove = newOrder[draggedCategoryIdx];
                                                newOrder.splice(draggedCategoryIdx, 1);
                                                newOrder.splice(idx, 0, itemToMove);
                                                setShopSettings({ ...shopSettings, categoryOrder: newOrder });
                                                setDraggedCategoryIdx(null);
                                            }}
                                            className="flex items-center gap-2 bg-stone-50 hover:bg-white border border-stone-200 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition shadow-2xs"
                                        >
                                            <IconGripVertical />
                                            <span className="text-xs font-black text-stone-800 flex-1 truncate">{cat}</span>
                                            <span className="text-[10px] font-bold text-stone-400 bg-white px-2 py-0.5 rounded-md border border-stone-200">{idx + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                <div className="border-b border-stone-100 pb-3">
                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">6. Εξωτερικοί Σύνδεσμοι Προφίλ (Fallback Links)</h3>
                                    <p className="text-xs text-stone-500 mt-0.5">Αν ένα προϊόν δεν διαθέτει δικό του άμεσο σύνδεσμο αγοράς, ο πελάτης ανακατευθύνεται εδώ.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                    {Object.keys(shopSettings.fallbackLinks).map(platform => (
                                        <div key={platform} className="space-y-1">
                                            <label className="text-xs font-bold text-stone-700 capitalize">{platform}</label>
                                            <input
                                                aria-label={`Εξωτερικός σύνδεσμος προφίλ ${platform}`}
                                                type="url"
                                                placeholder={`https://${platform.toLowerCase()}...`}
                                                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                                value={shopSettings.fallbackLinks[platform]}
                                                onChange={e => setShopSettings({
                                                    ...shopSettings,
                                                    fallbackLinks: { ...shopSettings.fallbackLinks, [platform]: e.target.value }
                                                })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                <div className="border-b border-stone-100 pb-3">
                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">7. Έξοδα Αποστολής & Μεταφορικά (Checkout)</h3>
                                    <p className="text-xs text-stone-500 mt-0.5">
                                        Ρυθμίστε τα κόστη και τα όρια δωρεάν αποστολής που εφαρμόζονται στο ταμείο για BoxNow και Courier.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">BOX NOW Locker 24/7</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Βασικό Κόστος (€)</label>
                                                <input
                                                    aria-label="Βασικό κόστος αποστολής Box Now σε ευρώ"
                                                    type="number"
                                                    min="0"
                                                    step="0.10"
                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                    value={shopSettings.shippingSettings?.boxnowPrice ?? 2.5}
                                                    onChange={e => setShopSettings(prev => ({
                                                        ...prev,
                                                        shippingSettings: {
                                                            ...prev.shippingSettings,
                                                            boxnowPrice: parseFloat(e.target.value) || 0
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Όριο Δωρεάν (€)</label>
                                                <input
                                                    aria-label="Όριο δωρεάν αποστολής Box Now σε ευρώ"
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                    value={shopSettings.shippingSettings?.boxnowFreeThreshold ?? 45}
                                                    onChange={e => setShopSettings(prev => ({
                                                        ...prev,
                                                        shippingSettings: {
                                                            ...prev.shippingSettings,
                                                            boxnowFreeThreshold: parseFloat(e.target.value) || 0
                                                        }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Courier (ACS / Speedex)</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Βασικό Κόστος (€)</label>
                                                <input
                                                    aria-label="Βασικό κόστος αποστολής courier σε ευρώ"
                                                    type="number"
                                                    min="0"
                                                    step="0.10"
                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                    value={shopSettings.shippingSettings?.courierPrice ?? 4.0}
                                                    onChange={e => setShopSettings(prev => ({
                                                        ...prev,
                                                        shippingSettings: {
                                                            ...prev.shippingSettings,
                                                            courierPrice: parseFloat(e.target.value) || 0
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-stone-700 mb-1">Όριο Δωρεάν (€)</label>
                                                <input
                                                    aria-label="Όριο δωρεάν αποστολής courier σε ευρώ"
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-900 font-bold outline-none"
                                                    value={shopSettings.shippingSettings?.courierFreeThreshold ?? 50}
                                                    onChange={e => setShopSettings(prev => ({
                                                        ...prev,
                                                        shippingSettings: {
                                                            ...prev.shippingSettings,
                                                            courierFreeThreshold: parseFloat(e.target.value) || 0
                                                        }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">Σημείωση / Επισήμανση Μεταφορικών (για ογκώδη αντικείμενα ή μεγαλύτερες θυρίδες)</label>
                                    <input
                                        aria-label="Σημείωση ή επισήμανση μεταφορικών"
                                        type="text"
                                        placeholder="π.χ. *Τα παραπάνω κόστη αφορούν βασικές θυρίδες. Για ογκώδη αντικείμενα ενδέχεται να υπάρξει προσαρμογή."
                                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                        value={shopSettings.shippingSettings?.customNotes || ''}
                                        onChange={e => setShopSettings(prev => ({
                                            ...prev,
                                            shippingSettings: {
                                                ...prev.shippingSettings,
                                                customNotes: e.target.value
                                            }
                                        }))}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSettingsTab === 'portfolio' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                        <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">Περιεχόμενο & Hero Σελίδας Portfolio</h3>
                                    </div>
                                    <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                                        Οι ρυθμίσεις αυτής της καρτέλας αφορούν αποκλειστικά το Portfolio (<strong>#portfolio</strong>): τίτλους έκθεσης, κουμπί επικοινωνίας, βίντεο φόντου και τις κατηγορίες έργων.
                                    </p>
                                </div>
                                <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το #portfolio</span>
                            </div>

                            <HeroAppearanceSettings value={shopSettings.portfolioDesign.heroAppearance} onChange={value => setShopSettings(prev => ({ ...prev, portfolioDesign: { ...prev.portfolioDesign, heroAppearance: value } }))} />
                            <ArtistProfileEditor />
                            <PortfolioDesignSettings
                                value={shopSettings.portfolioDesign}
                                onChange={value => setShopSettings(prev => ({ ...prev, portfolioDesign: value }))}
                            />

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                                <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Βίντεο Hero Portfolio</h3>
                                        <p className="text-xs text-stone-500 mt-0.5">Εμφανίζεται πίσω από τον τίτλο στο Portfolio, χωρίς ήχο και σε συνεχή επανάληψη.</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md">Αυτόματη επανάληψη (Muted)</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="portfolio-hero-video-url" className="block text-xs font-bold text-stone-700 mb-1">Σύνδεσμος αρχείου βίντεο (Direct URL)</label>
                                        <input
                                            id="portfolio-hero-video-url"
                                            type="url"
                                            placeholder="https://.../video.mp4"
                                            disabled={mediaPreparing || isSavingSettings}
                                            value={shopSettings.portfolioHeroVideoUrl || ''}
                                            onChange={e => setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: e.target.value }))}
                                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1">Δέχεται YouTube, Vimeo, απευθείας MP4/WebM ή Firebase Storage URL.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="portfolio-hero-video-file" className="block text-xs font-bold text-stone-700 mb-1">Ανέβασμα από υπολογιστή</label>
                                        <input
                                            id="portfolio-hero-video-file"
                                            type="file"
                                            accept={VIDEO_FILE_ACCEPT}
                                            disabled={mediaPreparing || isSavingSettings}
                                            aria-label="Ανέβασμα βίντεο Hero Portfolio"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                e.target.value = '';
                                                if (file) handleHeroVideoUpload(file, 'portfolio');
                                            }}
                                            className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 cursor-pointer"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1">{VIDEO_UPLOAD_HELP}</p>
                                    </div>
                                </div>

                                <VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} />
                                {portfolioHeroUploadStatus && <p role="status" className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">{portfolioHeroUploadStatus}</p>}

                                {shopSettings.portfolioHeroVideoUrl && (
                                    <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4">
                                        <video src={portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)} controls muted preload="metadata" referrerPolicy="no-referrer" className="max-h-36 w-full sm:w-64 rounded-xl bg-black object-cover shadow-xs" />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <MediaDownload media={{ url: portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl), type: 'video' }} name="aram-portfolio-hero-video" />
                                            {isKnownUnplayableHevcHeroUrl(shopSettings.portfolioHeroVideoUrl) && (
                                                <button
                                                    type="button"
                                                    disabled={mediaPreparing || isSavingSettings}
                                                    onClick={async () => {
                                                        const res = await fetch(TRANSCODED_HERO_H264_PATH);
                                                        const blob = await res.blob();
                                                        const h264File = new File([blob], '2026-11-04-145207521-h264.mp4', { type: 'video/mp4' });
                                                        await handleHeroVideoUpload(h264File, 'portfolio');
                                                    }}
                                                    className="rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold transition"
                                                >
                                                    Αποθήκευση H.264 στο Cloud
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={mediaPreparing || isSavingSettings}
                                                onClick={() => {
                                                    setShopSettings(prev => ({ ...prev, portfolioHeroVideoUrl: '' }));
                                                    setPortfolioHeroUploadStatus('Το βίντεο αφαιρέθηκε από την προεπισκόπηση. Πάτησε Αποθήκευση Ρυθμίσεων για να εφαρμοστεί.');
                                                }}
                                                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition"
                                            >
                                                Αφαίρεση βίντεο
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
                                <div className="border-b border-stone-100 pb-3">
                                    <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Ζωντανή Προεπισκόπηση Hero Portfolio</h3>
                                    <p className="text-xs text-stone-500 mt-0.5">Έτσι εμφανίζεται ο κεντρικός τομέας του Portfolio στους επισκέπτες.</p>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-stone-200 shadow-xs">
                                    <CollectionHero preview collection="portfolio" key={shopSettings.portfolioHeroVideoUrl}
                                        title={shopSettings.portfolioDesign.title}
                                        description={shopSettings.portfolioDesign.subtitle}
                                        appearance={shopSettings.portfolioDesign.heroAppearance}
                                        videoUrl={portfolioHeroVideoUrl(shopSettings.portfolioHeroVideoUrl)} />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSettingsTab === 'fields' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="rounded-2xl border border-sky-200 bg-linear-to-r from-sky-50 to-blue-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                                        <h3 className="text-sm font-black text-sky-950 uppercase tracking-wider">Προτάσεις Φορμών Καταχώρησης Back Office</h3>
                                    </div>
                                    <p className="text-xs text-sky-800 leading-relaxed max-w-2xl">
                                        Διαχειριστείτε τις έτοιμες προτάσεις (dropdowns και chips) που εμφανίζονται όταν καταχωρείτε ή επεξεργάζεστε προϊόντα. Σύρετε για αναδιάταξη, ταξινομήστε με ένα κλικ τα συχνότερα πρώτα ή κρύψτε όσα δεν επιθυμείτε.
                                    </p>
                                </div>
                                <span className="text-[10px] font-black bg-sky-200/80 text-sky-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το Back Office</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-3">
                                {[
                                    ['all', 'Όλα τα πεδία', null],
                                    ['color', 'Χρώματα', settingsColorOptions.length],
                                    ['material', 'Υλικά', settingsMaterialOptions.length],
                                    ['category', 'Κατηγορίες', settingsCategoryOptions.length],
                                    ['collection', 'Συλλογές', settingsCollectionOptions.length],
                                    ['status', 'Καταστάσεις', settingsStatusOptions.length],
                                    ['platform', 'Πλατφόρμες', settingsPlatformOptions.length]
                                ].map(([filterKey, filterLabel, count]) => (
                                    <button
                                        key={filterKey}
                                        type="button"
                                        onClick={() => setActiveFieldFilter(filterKey as string)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                            activeFieldFilter === filterKey
                                                ? 'bg-stone-900 text-white shadow-2xs'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                                        }`}
                                    >
                                        <span>{filterLabel}</span>
                                        {count !== null && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeFieldFilter === filterKey ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {(activeFieldFilter === 'all' || activeFieldFilter === 'color') && (
                                    renderFieldOptionManager({
                                        type: 'color',
                                        title: 'Χρώματα Προϊόντων',
                                        options: settingsColorOptions,
                                        counts: colorUsageCounts,
                                        hiddenOptions: hiddenColorOptions,
                                        tone: 'indigo'
                                    })
                                )}

                                {(activeFieldFilter === 'all' || activeFieldFilter === 'material') && (
                                    renderFieldOptionManager({
                                        type: 'material',
                                        title: 'Υλικά Προϊόντων',
                                        options: settingsMaterialOptions,
                                        counts: materialUsageCounts,
                                        hiddenOptions: hiddenMaterialOptions
                                    })
                                )}

                                {(activeFieldFilter === 'all' || activeFieldFilter === 'category') && (
                                    renderFieldOptionManager({
                                        type: 'category',
                                        title: 'Κατηγορίες Προϊόντων',
                                        options: settingsCategoryOptions,
                                        counts: categoryUsageCounts,
                                        hiddenOptions: hiddenCategoryOptions
                                    })
                                )}

                                {(activeFieldFilter === 'all' || activeFieldFilter === 'collection') && (
                                    renderFieldOptionManager({
                                        type: 'collection',
                                        title: 'Συλλογές',
                                        options: settingsCollectionOptions,
                                        counts: collectionUsageCounts,
                                        hiddenOptions: hiddenCollectionOptions
                                    })
                                )}

                                {(activeFieldFilter === 'all' || activeFieldFilter === 'status') && (
                                    renderFieldOptionManager({
                                        type: 'status',
                                        title: 'Καταστάσεις Διαθεσιμότητας',
                                        options: settingsStatusOptions,
                                        counts: statusUsageCounts,
                                        hiddenOptions: hiddenStatusOptions
                                    })
                                )}

                                {(activeFieldFilter === 'all' || activeFieldFilter === 'platform') && (
                                    renderFieldOptionManager({
                                        type: 'platform',
                                        title: 'Πλατφόρμες Πώλησης',
                                        options: settingsPlatformOptions,
                                        counts: platformUsageCounts,
                                        hiddenOptions: hiddenPlatformOptions
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeSettingsTab === 'assistant' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50 to-fuchsia-50 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                        <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider">AI Assistant Φόρμας Back Office</h3>
                                    </div>
                                    <p className="text-xs text-purple-800 leading-relaxed max-w-2xl">
                                        Αυτή η ρύθμιση αφορά <strong>αποκλειστικά τον βοηθό τεχνητής νοημοσύνης μέσα στη φόρμα καταχώρησης προϊόντων</strong> (για αυτόματη δημιουργία τίτλων, περιγραφών και tags). Δεν εμφανίζεται δημόσιο AI bot στους πελάτες του shop.
                                    </p>
                                </div>
                                <span className="text-[10px] font-black bg-purple-200/80 text-purple-900 px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">Μόνο για το Back Office</span>
                            </div>

                            <section className="border border-stone-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                                <div className="flex items-start gap-3 border-b border-stone-100 pb-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <IconBolt />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Back-office AI Endpoint</h3>
                                        <p className="text-xs text-stone-500 mt-0.5">Διεύθυνση του serverless function που εκτελεί τις κλήσεις προς τα μοντέλα AI.</p>
                                    </div>
                                </div>

                                <div>
                                    <input
                                        aria-label="Σύνδεσμος Back-office AI endpoint"
                                        type="url"
                                        placeholder="Άστο κενό για χρήση του /api/backoffice-ai ή βάλε http://127.0.0.1:3000/api/backoffice-ai για τοπικό server"
                                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-900 transition outline-none text-xs font-mono text-stone-800"
                                        value={assistantSettings.backofficeEndpoint || ''}
                                        onChange={e => updateAssistantSetting('backofficeEndpoint', e.target.value)}
                                    />
                                    <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                                        Όταν παραμένει κενό, χρησιμοποιείται αυτόματα το ενσωματωμένο Netlify / Express endpoint <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">/api/backoffice-ai</code>.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Πού δουλεύει</p>
                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Μέσα στη φόρμα προϊόντος για δημιουργία τίτλων, περιγραφών, χρωμάτων, υλικών, tags και Instagram captions.</p>
                                    </div>
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Εικόνες & Όραση</p>
                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Αναλύει τις ανεβασμένες φωτογραφίες του κοσμήματος για αυτόματη ανίχνευση υλικών, χρωμάτων και λεπτομερειών.</p>
                                    </div>
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                                        <p className="text-xs font-black text-stone-800 uppercase tracking-wider"> Ασφάλεια & Πρόσβαση</p>
                                        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">Προστατεύεται με Firebase authentication και admin email check. Κανένα API key δεν εκτίθεται στο δημόσιο frontend.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4.5 space-y-1.5">
                                <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Οδηγός Αντιμετώπισης Σφαλμάτων</p>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    • <strong>Σφάλμα 503</strong>: Ελέγξτε τα <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">GEMINI_API_KEY</code> και <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">AI_PROVIDER</code> στα environment variables του Netlify (ή στο τοπικό αρχείο <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">.env</code>).<br />
                                    • <strong>Σφάλμα 401</strong>: Απαιτείται ενεργή σύνδεση με λογαριασμό διαχειριστή στο Back Office.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeSettingsTab === 'reviews' && (<VintedReviewsSettings {...vintedReviews} />)}
                    </fieldset>
                </div>

                <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-stone-600">
                        Η αποθήκευση ενημερώνει τις κοινές ρυθμίσεις του καταστήματος.
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            disabled={mediaPreparing || isSavingSettings}
                            onClick={() => setIsSettingsOpen(false)}
                            className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition disabled:opacity-40 shadow-2xs"
                        >
                            Κλείσιμο
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={!settingsLoaded || isSavingSettings || mediaPreparing}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            <IconCheck />
                            {isSavingSettings ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
