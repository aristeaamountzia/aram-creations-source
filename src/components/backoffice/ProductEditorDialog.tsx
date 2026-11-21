import { IconEye, IconX, IconExternalLink } from './icons';
import { useDialogKeyboard } from '../../lib/use-dialog-keyboard';
import { stockForSelectedStatus } from '../../lib/stock-edit';
import { AlertTriangle } from 'lucide-react';
import { MediaManager } from '../media/MediaManager';
import { VideoUploadStatus } from '../VideoUploadStatus';
import { VIDEO_UPLOAD_HELP } from '../../lib/video-policy';
import type { ProductWorkspace } from './useProductWorkspace';
import type { ProductAi } from './useProductAi';
import type { CatalogOptions } from './useCatalogOptions';
import type { MediaStudio } from './useMediaStudio';
import type { ProductMedia } from './useProductMedia';
import type { ProductActions } from './createProductActions';
import type { BackOfficeSharedState } from './backoffice-types';
import type { BackOfficeUploads } from './useBackOfficeUploads';

type ProductEditorDialogProps = Pick<
    ProductWorkspace,
    'activeFormTab' | 'closeItemEditor' | 'currentItem' | 'formCategory' | 'formCollection' | 'formColorsArr' |
    'formCost' | 'formDate' | 'formDimensions' | 'formManualLikes' | 'formManualViews' | 'formMaterials' |
    'formName' | 'formNotes' | 'formOriginalPrice' | 'formPostedPlatforms' | 'formPrice' |
    'formPrivateMediaList' | 'formPurchaseLinks' | 'formShopMediaList' | 'formStatus' | 'formStock' |
    'formStorage' | 'formWeight' | 'handleDragTagStart' | 'handleDropTag' | 'isAddOpen' | 'isCustomCategory' |
    'isCustomCollection' | 'isCustomPostedSite' | 'isCustomPurchaseSite' | 'isCustomStatus' |
    'isCustomStorage' | 'isEditMode' | 'newColorHex' | 'newColorInput' | 'newMaterialInput' | 'newPostedSite' |
    'newPostedUrl' | 'newPostedVisible' | 'newPurchaseSite' | 'newPurchaseUrl' | 'setActiveFormTab' |
    'setFormCategory' | 'setFormCollection' | 'setFormColorsArr' | 'setFormCost' | 'setFormDate' |
    'setFormDimensions' | 'setFormManualLikes' | 'setFormManualViews' | 'setFormMaterials' | 'setFormName' |
    'setFormNotes' | 'setFormOriginalPrice' | 'setFormPostedPlatforms' | 'setFormPrice' |
    'setFormPrivateMediaList' | 'setFormPurchaseLinks' | 'setFormShopMediaList' | 'setFormStatus' |
    'setFormStock' | 'setFormStorage' | 'setFormWeight' | 'setIsCustomCategory' | 'setIsCustomCollection' |
    'setIsCustomPostedSite' | 'setIsCustomPurchaseSite' | 'setIsCustomStatus' | 'setIsCustomStorage' |
    'setNewColorHex' | 'setNewColorInput' | 'setNewMaterialInput' | 'setNewPostedSite' | 'setNewPostedUrl' |
    'setNewPostedVisible' | 'setNewPurchaseSite' | 'setNewPurchaseUrl'
> &
    Pick<
    ProductAi,
    'aiAccessCode' | 'aiProductDraft' | 'aiProductError' | 'aiProductPrompt' | 'applyAiProductDraft' |
    'getBackofficeAiEndpoint' | 'handleAiAccessCodeChange' | 'handleBackofficeAiGenerate' |
    'isAiProductWorking' | 'setAiProductPrompt' | 'setShowAiAccessCode' | 'showAiAccessCode'
> &
    Pick<
    CatalogOptions,
    'allAvailableColors' | 'allAvailableMaterials' | 'allAvailablePlatforms' | 'allCollections' |
    'allFormCategories' | 'allFormStatuses' | 'allStorages' | 'duplicateNameInfo' | 'getColorSwatch' |
    'getStatusColor' | 'handleAddColor' | 'handleAddMaterial' | 'handleAddPostedPlatform' |
    'handleAddPurchaseLink'
> &
    Pick<
    MediaStudio,
    'canRestoreMediaOriginal' | 'handleOpenImageEditor' | 'handleRestoreEditedMedia' | 'isAnimatedGifMedia' |
    'openImageEditor'
> &
    Pick<
    ProductMedia,
    'handleFileSelectPrivate' | 'handleFileSelectShop' | 'handleRefreshSmartSuggestions' |
    'handleRemovePrivateMedia' | 'handleRemoveShopMedia' | 'refreshSmartSuggestionsFromMain' |
    'smartSuggestions'
> &
    Pick<ProductActions, 'handleSaveItem'> &
    Pick<BackOfficeSharedState, 'isSaving'> &
    Pick<
    BackOfficeUploads,
    'mediaPreparing' | 'uploadProgress' | 'uploadStatus' | 'videoAbort' | 'videoCompressing' | 'videoProgress'
>;

export function ProductEditorDialog(props: ProductEditorDialogProps) {
    const {
        activeFormTab, aiAccessCode, aiProductDraft, aiProductError, aiProductPrompt, allAvailableColors,
        allAvailableMaterials, allAvailablePlatforms, allCollections, allFormCategories, allFormStatuses,
        allStorages, applyAiProductDraft, canRestoreMediaOriginal, closeItemEditor, currentItem,
        duplicateNameInfo, formCategory, formCollection, formColorsArr, formCost, formDate, formDimensions,
        formManualLikes, formManualViews, formMaterials, formName, formNotes, formOriginalPrice,
        formPostedPlatforms, formPrice, formPrivateMediaList, formPurchaseLinks, formShopMediaList, formStatus,
        formStock, formStorage, formWeight, getBackofficeAiEndpoint, getColorSwatch, getStatusColor,
        handleAddColor, handleAddMaterial, handleAddPostedPlatform, handleAddPurchaseLink,
        handleAiAccessCodeChange, handleBackofficeAiGenerate, handleDragTagStart, handleDropTag,
        handleFileSelectPrivate, handleFileSelectShop, handleOpenImageEditor, handleRefreshSmartSuggestions,
        handleRemovePrivateMedia, handleRemoveShopMedia, handleRestoreEditedMedia, handleSaveItem, isAddOpen,
        isAiProductWorking, isAnimatedGifMedia, isCustomCategory, isCustomCollection, isCustomPostedSite,
        isCustomPurchaseSite, isCustomStatus, isCustomStorage, isEditMode, isSaving, mediaPreparing,
        newColorHex, newColorInput, newMaterialInput, newPostedSite, newPostedUrl, newPostedVisible,
        newPurchaseSite, newPurchaseUrl, openImageEditor, refreshSmartSuggestionsFromMain, setActiveFormTab,
        setAiProductPrompt, setFormCategory, setFormCollection, setFormColorsArr, setFormCost, setFormDate,
        setFormDimensions, setFormManualLikes, setFormManualViews, setFormMaterials, setFormName, setFormNotes,
        setFormOriginalPrice, setFormPostedPlatforms, setFormPrice, setFormPrivateMediaList,
        setFormPurchaseLinks, setFormShopMediaList, setFormStatus, setFormStock, setFormStorage, setFormWeight,
        setIsCustomCategory, setIsCustomCollection, setIsCustomPostedSite, setIsCustomPurchaseSite,
        setIsCustomStatus, setIsCustomStorage, setNewColorHex, setNewColorInput, setNewMaterialInput,
        setNewPostedSite, setNewPostedUrl, setNewPostedVisible, setNewPurchaseSite, setNewPurchaseUrl,
        setShowAiAccessCode, showAiAccessCode, smartSuggestions, uploadProgress, uploadStatus, videoAbort,
        videoCompressing, videoProgress
    } = props;
    const dialog = useDialogKeyboard(isAddOpen, () => {
        if (!isSaving && !mediaPreparing) closeItemEditor();
    });
    if (!isAddOpen) return null;

    return (
        <div
            ref={dialog} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" tabIndex={-1}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSaving && !mediaPreparing) {
                    closeItemEditor();
                }
            }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 cursor-pointer overflow-y-auto"
        >

            {isSaving && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-6 rounded-2xl">
                    <div className="w-full max-w-sm text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold">CSV</div>
                        <h3 className="font-bold text-stone-800 mb-4">{uploadStatus || 'Προετοιμασία...'}</h3>
                        <div className="w-full bg-stone-200 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-xl font-black text-emerald-600">{Math.round(uploadProgress)}%</p>
                        <p className="text-xs text-stone-500 mt-6 font-medium">Παρακαλώ μην κλείσετε το παράθυρο, ο συγχρονισμός είναι σε εξέλιξη...</p>
                    </div>
                </div>
            )}

            <div
                onClick={(e) => e.stopPropagation()}
                className="studio-dialog bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl relative border border-stone-200 cursor-default animate-fade-in"
            >
                {(() => {
                    const modalPreviewMedia = formShopMediaList?.[0]?.url || currentItem?.imageUrl || currentItem?.mediaList?.[0]?.url || formPrivateMediaList?.[0]?.url;
                    const modalPreviewType = formShopMediaList?.[0]?.type || currentItem?.fileType || (modalPreviewMedia?.includes('.mp4') ? 'video' : 'image');
                    return (
                        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-4 bg-stone-50 rounded-t-2xl shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                {modalPreviewMedia ? (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-stone-200 bg-stone-100 overflow-hidden shrink-0 shadow-sm relative group">
                                        {modalPreviewType === 'video' ? (
                                            <video src={modalPreviewMedia} referrerPolicy="no-referrer" className="w-full h-full object-cover" muted playsInline />
                                        ) : (
                                            <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={modalPreviewMedia} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[10px] text-white font-bold">Προεπισκόπηση</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-dashed border-stone-300 bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">

                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                                            {isEditMode ? 'Επεξεργασία Προϊόντος' : 'Νέα Καταχώρηση'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-stone-200/80 text-stone-700">
                                            {formCategory || currentItem?.category || 'Κόσμημα'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(formStatus || currentItem?.status || 'Διαθέσιμο')}`}>
                                            {formStatus || currentItem?.status || 'Διαθέσιμο'}
                                        </span>
                                        {formPrice && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                {formPrice}€
                                            </span>
                                        )}
                                        {currentItem?.id && (
                                            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                                                #{currentItem.id.slice(0, 6)}
                                            </span>
                                        )}
                                    </div>
                                    <h2 id="product-editor-title" className="break-words text-base sm:text-lg font-semibold text-stone-900 leading-tight">
                                        {formName || currentItem?.name || (isEditMode ? 'Επεξεργασία υπάρχουσας καταχώρησης' : 'Νέα καταχώρηση καταλόγου')}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {modalPreviewMedia && modalPreviewType !== 'video' && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenImageEditor(modalPreviewMedia)}
                                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-sm"
                                        title="Επεξεργασία εικόνας στο ενσωματωμένο studio"
                                    >
                                        <span className="hidden md:inline">Επεξεργασία εικόνας</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={mediaPreparing || isSaving}
                                    onClick={closeItemEditor}
                                    className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-lg border border-stone-200 transition shadow-sm"
                                    title="Κλείσιμο (Esc)"
                                >
                                    <IconX />
                                </button>
                            </div>
                        </div>
                    );
                })()}
                <div role="group" aria-label="Ενότητες προϊόντος" className="px-5 py-2.5 border-b border-stone-200 bg-stone-50/90 flex flex-wrap items-center gap-2 shrink-0">
                    {[
                        ['form-basic', 'Βασικά'],
                        ['form-pricing', 'Τιμές'],
                        ['form-tags', 'Χρώματα / Υλικά'],
                        ['form-links', 'Links'],
                        ['form-shop-media', 'Εικόνες Shop'],
                        ['form-private-media', 'Αρχείο'],
                        ['form-ai', 'AI Studio']
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={activeFormTab === id}
                            onClick={() => {
                                setActiveFormTab(id);
                                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition border shadow-xs ${
                                activeFormTab === id
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {videoProgress && <div className="px-5 py-2 shrink-0"><VideoUploadStatus value={videoProgress} busy={videoCompressing} onCancel={() => videoAbort.current?.abort()} /></div>}
                <div className="overflow-y-auto p-6 flex-1">
                    <form id="jewelry-form" onSubmit={handleSaveItem} className="flex flex-col gap-8">
                        <section id="form-ai" className="order-last scroll-mt-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 shadow-xs">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3 mb-4">
                                        <div>
                                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">AI Studio Back-office</h3>
                                            <p className="text-xs text-stone-500 font-medium">Δημιουργεί τίτλους, περιγραφές, χρώματα, υλικά, tags και captions από τα στοιχεία της φόρμας.</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${getBackofficeAiEndpoint() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {getBackofficeAiEndpoint() ? 'Endpoint ορισμένο' : 'Λείπει endpoint'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 mb-3">
                                        <textarea
                                            className="w-full border border-stone-200 rounded-lg px-4 py-3 h-24 bg-white focus:border-stone-400 outline-none resize-none text-sm"
                                            value={aiProductPrompt}
                                            onChange={e => setAiProductPrompt(e.target.value)}
                                            placeholder="Προαιρετική οδηγία: π.χ. πιο minimal ύφος, ιδέα για δώρο, περιγραφή για Instagram, πιο luxury τόνος..."
                                        />
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <input
                                                    type={showAiAccessCode ? 'text' : 'password'}
                                                    className="w-full border border-stone-200 rounded-lg pl-3 pr-10 py-2 bg-white focus:border-stone-400 outline-none text-sm"
                                                    value={aiAccessCode}
                                                    onChange={e => handleAiAccessCodeChange(e.target.value)}
                                                    placeholder="AI access code"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAiAccessCode(prev => !prev)}
                                                    className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700"
                                                    title={showAiAccessCode ? 'Κρύψε τον κωδικό' : 'Δείξε τον κωδικό'}
                                                    aria-label={showAiAccessCode ? 'Κρύψε τον κωδικό AI' : 'Δείξε τον κωδικό AI'}
                                                >
                                                    <IconEye />
                                                </button>
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-stone-500">Ο κωδικός μένει σε αυτό το browser session και δεν γράφεται στο HTML ή στο Firebase.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => handleBackofficeAiGenerate('full')} disabled={isAiProductWorking} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 disabled:opacity-50 transition shadow-xs">Πλήρης πρόταση</button>
                                            <button type="button" onClick={() => handleBackofficeAiGenerate('title')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Τίτλος</button>
                                            <button type="button" onClick={() => handleBackofficeAiGenerate('description')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Περιγραφή</button>
                                            <button type="button" onClick={() => handleBackofficeAiGenerate('tags')} disabled={isAiProductWorking} className="px-4 py-2 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-100 disabled:opacity-50 transition">Χρώματα / Υλικά</button>

                                        </div>

                                        {isAiProductWorking && (
                                            <div className="space-y-1 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
                                                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                                                    <span>Το AI επεξεργάζεται τα στοιχεία της δημιουργίας...</span>

                                                </div>
                                                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-stone-900 h-1.5 rounded-full animate-pulse w-full"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {aiProductError && (
                                        <div className="mt-3 border border-rose-200 bg-rose-50 text-rose-800 rounded-xl p-3.5 text-xs space-y-2">
                                            <div className="font-bold flex items-center gap-1.5 text-rose-800">
                                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                                <span>{aiProductError}</span>
                                            </div>
                                            {aiProductError.includes('GEMINI_API_KEY') && (
                                                <div className="p-2.5 bg-white/80 rounded-lg border border-rose-100 text-stone-700 space-y-1.5">
                                                    <p className="font-bold text-stone-800">Οδηγός Ενεργοποίησης Google Gemini AI:</p>
                                                    <ol className="list-decimal list-inside space-y-1 text-stone-600">
                                                        <li>Αποκτήστε κλειδί API από το <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-stone-900">Google AI Studio</a>.</li>
                                                        <li>Προσθέστε στο περιβάλλον Netlify / <code>.env</code> τη μεταβλητή: <code>GEMINI_API_KEY=το_κλειδί_σας</code>.</li>
                                                    </ol>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="lg:w-80 bg-white border border-stone-200 rounded-xl p-3 min-h-[160px]">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Πρόταση AI</h4>
                                        {aiProductDraft && (
                                            <div className="flex gap-1">
                                                <button type="button" onClick={() => applyAiProductDraft(true)} className="px-2 py-1 bg-stone-100 text-stone-800 border border-stone-200 rounded text-[10px] font-bold">Κενά</button>
                                                <button type="button" onClick={() => applyAiProductDraft(false)} className="px-2 py-1 bg-stone-900 text-white rounded text-[10px] font-bold">Εφαρμογή</button>
                                            </div>
                                        )}
                                    </div>
                                    {!aiProductDraft ? (
                                        <p className="text-xs text-stone-400 italic leading-relaxed">Οι προτάσεις θα εμφανιστούν εδώ πριν εφαρμοστούν στη φόρμα.</p>
                                    ) : (
                                        <div className="space-y-2 text-xs">
                                            {aiProductDraft.title && <div><span className="font-black text-stone-500">Τίτλος:</span> <span className="text-stone-800">{aiProductDraft.title}</span></div>}
                                            {aiProductDraft.category && <div><span className="font-black text-stone-500">Κατηγορία:</span> <span className="text-stone-800">{aiProductDraft.category}</span></div>}
                                            {aiProductDraft.colors.length > 0 && <div><span className="font-black text-stone-500">Χρώματα:</span> <span className="text-stone-800">{aiProductDraft.colors.join(', ')}</span></div>}
                                            {aiProductDraft.materials.length > 0 && <div><span className="font-black text-stone-500">Υλικά:</span> <span className="text-stone-800">{aiProductDraft.materials.join(', ')}</span></div>}
                                            {aiProductDraft.description && <p className="border-t border-violet-50 pt-2 leading-relaxed text-stone-700">{aiProductDraft.description}</p>}
                                            {aiProductDraft.instagramCaption && <p className="border-t border-violet-50 pt-2 leading-relaxed text-stone-500">{aiProductDraft.instagramCaption}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section id="form-basic" className="scroll-mt-4">
                            <h3 className="text-sm font-black text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Βασικα Στοιχεια</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Όνομα Δημιουργίας *</label>
                                    <input required type="text" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formName} onChange={e => setFormName(e.target.value)} />
                                    {duplicateNameInfo && (
                                        <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl p-3">
                                            <p className="text-xs font-bold text-amber-800">Υπάρχει ήδη καταχώρηση με αυτό το όνομα: {duplicateNameInfo.duplicate.name}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {duplicateNameInfo.suggestions.map(suggestion => (
                                                    <button key={suggestion} type="button" onClick={() => setFormName(suggestion)} className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-100 transition">
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατηγορία *</label>
                                    {isCustomCategory ? (
                                        <div className="flex gap-2">
                                            <input type="text" required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="Νέα κατηγορία..." autoFocus />
                                            <button type="button" onClick={() => { setIsCustomCategory(false); setFormCategory('Κολιέ'); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                        </div>
                                    ) : (
                                        <select required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCategory} onChange={e => {
                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomCategory(true); setFormCategory(''); }
                                            else { setFormCategory(e.target.value); }
                                        }}>
                                            <option value="" disabled>Επιλέξτε...</option>
                                            {allFormCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Ονομασία Συλλογής</label>
                                    {isCustomCollection ? (
                                        <div className="flex gap-2">
                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCollection} onChange={e => setFormCollection(e.target.value)} placeholder="Νέα συλλογή..." autoFocus />
                                            <button type="button" onClick={() => { setIsCustomCollection(false); setFormCollection(''); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                        </div>
                                    ) : (
                                        <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formCollection} onChange={e => {
                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomCollection(true); setFormCollection(''); }
                                            else { setFormCollection(e.target.value); }
                                        }}>
                                            <option value="">(Χωρίς Συλλογή)</option>
                                            {allCollections.map(col => <option key={col} value={col}>{col}</option>)}
                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατάσταση *</label>
                                    {isCustomStatus ? (
                                        <div className="flex gap-2">
                                            <input type="text" required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formStatus} onChange={e => setFormStatus(e.target.value)} placeholder="Νέα κατάσταση..." autoFocus />
                                            <button type="button" onClick={() => { setIsCustomStatus(false); setFormStatus('Διαθέσιμο'); }} className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold">X</button>
                                        </div>
                                    ) : (
                                        <select required className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none transition" value={formStatus} onChange={e => {
                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomStatus(true); setFormStatus(''); }
                                            else { setFormStatus(e.target.value); setFormStock(stockForSelectedStatus(e.target.value, Number(formStock))); }
                                        }}>
                                            {allFormStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Προσθήκη Νέας...</option>
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Ημερομηνία Κατασκευής</label>
                                    <input type="date" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                                </div>
                            </div>
                        </section>

                        <section id="form-pricing" className="scroll-mt-4">
                            <h3 className="text-sm font-black text-emerald-600/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Οικονομικα & Αποθεμα</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Τιμή Πώλησης (€)</label>
                                    <input type="number" step="any" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-stone-600">Αρχική Τιμή (€)</label>
                                        {Number(formOriginalPrice) > Number(formPrice) && Number(formPrice) > 0 && (
                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                                -{Math.round(((Number(formOriginalPrice) - Number(formPrice)) / Number(formOriginalPrice)) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <input type="number" step="any" placeholder="π.χ. 24.00 (προαιρετικό)" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formOriginalPrice} onChange={e => setFormOriginalPrice(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κόστος Υλικών (€)</label>
                                    <input type="number" step="any" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formCost} onChange={e => setFormCost(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Χειροκίνητα Likes</label>
                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formManualLikes} onChange={e => setFormManualLikes(Math.max(0, Number(e.target.value) || 0))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Χειροκίνητες Προβολές</label>
                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formManualViews} onChange={e => setFormManualViews(Math.max(0, Number(e.target.value) || 0))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Απόθεμα (Τεμ.)</label>
                                    <input type="number" min="0" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white focus:border-stone-500 outline-none" value={formStock} onChange={e => {
                                        const value = e.target.value;
                                        setFormStock(value);
                                        if (value !== '' && Number(value) > 0 && formStatus === 'Πουλήθηκε') setFormStatus('Διαθέσιμο');
                                        if (value === '0' && formStatus === 'Διαθέσιμο') setFormStatus('Πουλήθηκε');
                                    }} />
                                </div>
                            </div>
                        </section>

                        <section id="form-storage" className="scroll-mt-4">
                            <h3 className="text-sm font-black text-amber-600/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Διαστασεις & Αποθηκευση</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Βάρος</label>
                                    <input type="text" placeholder="π.χ. 15g" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formWeight} onChange={e => setFormWeight(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Διαστάσεις</label>
                                    <input type="text" placeholder="π.χ. 4x3 cm" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formDimensions} onChange={e => setFormDimensions(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κωδ. Αποθήκευσης</label>
                                    {isCustomStorage ? (
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="π.χ. Κουτί Α2" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formStorage} onChange={e => setFormStorage(e.target.value)} autoFocus />
                                            <button type="button" onClick={() => { setIsCustomStorage(false); setFormStorage(''); }} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                        </div>
                                    ) : (
                                        <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 focus:bg-white outline-none" value={formStorage} onChange={e => { if (e.target.value === 'NEW_CUSTOM') { setIsCustomStorage(true); setFormStorage(''); } else setFormStorage(e.target.value); }}>
                                            <option value="">Χωρίς αποθήκευση</option>
                                            {allStorages.map(storage => <option key={storage} value={storage}>{storage}</option>)}
                                            <option value="NEW_CUSTOM">+ Νέος κωδικός...</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section id="form-tags" className="scroll-mt-4">
                            <h3 className="text-sm font-black text-indigo-500/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Χρωματα & Υλικα</h3>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-stone-600 mb-2">Κύρια Χρώματα</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {allAvailableColors.map(col => (
                                        <button key={col} type="button" onClick={() => handleAddColor(col)} className="text-[11px] px-2.5 py-1 bg-white rounded-md hover:bg-indigo-50 border border-indigo-100 font-bold text-indigo-700 flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full border border-stone-300" style={{ backgroundColor: getColorSwatch(col) }}></span>+ {col}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" placeholder="Νέο χρώμα..." value={newColorInput} onChange={e => setNewColorInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddColor(newColorInput, newColorHex); } }} />
                                    <input type="color" className="h-10 w-12 rounded-lg border border-stone-200 bg-white p-1 cursor-pointer" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} title="Επίλεξε ακριβή απόχρωση" aria-label="Επίλεξε ακριβή απόχρωση" />
                                    <button type="button" onClick={() => handleAddColor(newColorInput, newColorHex)} className="bg-stone-800 text-white px-4 rounded-lg text-xs font-bold">Προσθήκη</button>
                                </div>
                                <div className="flex flex-wrap gap-2 p-2 bg-indigo-50/30 rounded-lg min-h-[44px] border border-indigo-50">
                                    {formColorsArr.map((col, idx) => (
                                        <span key={idx} draggable onDragStart={(e) => handleDragTagStart(e, idx, 'color')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropTag(e, idx, 'color')} className="bg-white border border-indigo-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-indigo-800 shadow-sm uppercase cursor-grab"><span className="w-3 h-3 rounded-full border border-stone-300" style={{ backgroundColor: getColorSwatch(col) }}></span>{col} <button type="button" onClick={() => setFormColorsArr(formColorsArr.filter((_, i) => i !== idx))} className="text-red-500"><IconX /></button></span>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-stone-600 mb-2">Υλικά Κατασκευής</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {allAvailableMaterials.map(mat => (
                                        <button key={mat} type="button" onClick={() => handleAddMaterial(mat)} className="text-[11px] px-2.5 py-1 bg-stone-100 rounded-md hover:bg-stone-200 border border-stone-200 font-medium text-stone-600">+ {mat}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none" placeholder="Νέο υλικό..." value={newMaterialInput} onChange={e => setNewMaterialInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddMaterial(newMaterialInput); } }} />
                                    <button type="button" onClick={() => handleAddMaterial(newMaterialInput)} className="bg-stone-800 text-white px-4 rounded-lg text-xs font-bold">Προσθήκη</button>
                                </div>
                                <div className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-lg min-h-[44px] border border-stone-100">
                                    {formMaterials.map((mat, idx) => (
                                        <span key={idx} draggable onDragStart={(e) => handleDragTagStart(e, idx, 'material')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropTag(e, idx, 'material')} className="bg-white border border-stone-200 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium shadow-sm cursor-grab">{mat} <button type="button" onClick={() => setFormMaterials(formMaterials.filter((_, i) => i !== idx))} className="text-red-500"><IconX /></button></span>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section id="form-links" className="scroll-mt-4">
                            <h3 className="text-sm font-black text-blue-500/70 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Links & Αναρτησεις</h3>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-2">Λινκ Αγοράς (Πού μπορεί να το αγοράσει ο πελάτης)</label>
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    {isCustomPurchaseSite ? (
                                        <div className="flex gap-1 w-full sm:w-1/3">
                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:bg-white outline-none transition" placeholder="π.χ. E-shop μου..." value={newPurchaseSite} onChange={e => setNewPurchaseSite(e.target.value)} autoFocus />
                                            <button type="button" onClick={() => {setIsCustomPurchaseSite(false); setNewPurchaseSite('Vinted');}} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                        </div>
                                    ) : (
                                        <select className="w-full sm:w-1/3 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" value={newPurchaseSite} onChange={e => {
                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomPurchaseSite(true); setNewPurchaseSite(''); }
                                            else { setNewPurchaseSite(e.target.value); }
                                        }}>
                                            {allAvailablePlatforms.map(plat => <option key={plat} value={plat}>{plat}</option>)}
                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Άλλη Πλατφόρμα...</option>
                                        </select>
                                    )}

                                    <input type="url" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" placeholder="Επικόλληση Link (https://...)" value={newPurchaseUrl} onChange={e => setNewPurchaseUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddPurchaseLink(); } }} />
                                    <button type="button" onClick={handleAddPurchaseLink} className="bg-stone-800 hover:bg-stone-700 text-white px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition">Προσθήκη</button>
                                </div>
                                <div className="flex flex-wrap gap-2 p-2 bg-blue-50/30 rounded-lg min-h-[44px] border border-blue-50">
                                    {formPurchaseLinks.length === 0 && <span className="text-xs text-stone-400 italic flex items-center">Κανένα link αγοράς δεν έχει προστεθεί.</span>}
                                    {formPurchaseLinks.map((linkObj, idx) => (
                                        <span key={idx} className="bg-white border border-blue-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-blue-800 shadow-sm max-w-full">
                                            {linkObj.site}
                                            {linkObj.url && <a href={linkObj.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title={linkObj.url}><IconExternalLink /></a>}
                                            <button type="button" onClick={() => setFormPurchaseLinks(formPurchaseLinks.filter((_, i) => i !== idx))} className="text-red-500 ml-1"><IconX /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs font-bold text-stone-600 mb-2">Πού έχει αναρτηθεί (Για δικό σου έλεγχο)</label>

                                <div className="flex flex-col lg:flex-row gap-2 mb-2 lg:items-center">
                                    {isCustomPostedSite ? (
                                        <div className="flex gap-1 w-full lg:w-1/4">
                                            <input type="text" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:bg-white outline-none transition" placeholder="π.χ. TikTok..." value={newPostedSite} onChange={e => setNewPostedSite(e.target.value)} autoFocus />
                                            <button type="button" onClick={() => {setIsCustomPostedSite(false); setNewPostedSite('Instagram');}} className="px-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-bold text-stone-600 transition">X</button>
                                        </div>
                                    ) : (
                                        <select className="w-full lg:w-1/4 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" value={newPostedSite} onChange={e => {
                                            if (e.target.value === 'NEW_CUSTOM') { setIsCustomPostedSite(true); setNewPostedSite(''); }
                                            else { setNewPostedSite(e.target.value); }
                                        }}>
                                            {allAvailablePlatforms.map(plat => <option key={plat} value={plat}>{plat}</option>)}
                                            <option value="NEW_CUSTOM" className="font-bold text-emerald-600">+ Άλλη Πλατφόρμα...</option>
                                        </select>
                                    )}

                                    <input type="url" className="w-full lg:flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white outline-none transition" placeholder="Link ανάρτησης (προαιρετικό)..." value={newPostedUrl} onChange={e => setNewPostedUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddPostedPlatform(); } }} />

                                    <div className="flex gap-2 w-full lg:w-auto">
                                        <label className="flex items-center justify-center gap-2 text-sm font-medium text-stone-700 cursor-pointer flex-1 lg:flex-none bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg hover:bg-white transition whitespace-nowrap">
                                            <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer" checked={newPostedVisible} onChange={e => setNewPostedVisible(e.target.checked)} />
                                            Ορατό στο Shop
                                        </label>
                                        <button type="button" onClick={handleAddPostedPlatform} className="bg-stone-800 hover:bg-stone-700 text-white px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition">Προσθήκη</button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 p-2 bg-stone-50 rounded-lg min-h-[44px] border border-stone-100">
                                    {formPostedPlatforms.length === 0 && <span className="text-xs text-stone-400 italic flex items-center">Δεν έχει σημειωθεί πού αναρτήθηκε.</span>}
                                    {formPostedPlatforms.map((platObj, idx) => (
                                        <span key={idx} className="bg-white border border-stone-200 text-xs px-2 py-1 rounded-md flex items-center gap-1.5 font-bold text-stone-700 shadow-sm max-w-full">
                                            {platObj.site}
                                            {platObj.url && <a href={platObj.url} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-800" title={platObj.url}><IconExternalLink /></a>}
                                            {platObj.showInShop ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded ml-1" title="Θα φαίνεται στο Shop">Ορατό</span> : <span className="text-[10px] bg-stone-200 text-stone-500 px-1 rounded ml-1" title="Κρυφό από το Shop">Κρυφό</span>}
                                            <button type="button" onClick={() => setFormPostedPlatforms(formPostedPlatforms.filter((_, i) => i !== idx))} className="text-red-500 ml-1"><IconX /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section id="form-shop-media" className="scroll-mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/55 p-4 shadow-sm">
                            <h3 className="text-sm font-black text-emerald-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Εικονες / Βιντεο (Βιτρινα Shop)</h3>
                            <MediaManager
                                items={formShopMediaList}
                                variant="shop"
                                uploadLabel="Αυτά τα αρχεία θα φαίνονται στον πελάτη (Οι εικόνες και τα βίντεο συμπιέζονται αυτόματα. Αρχικό βίντεο έως 1 GB / 10 λεπτά, τελικό έως 30 MB)."
                                inputClassName="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white cursor-pointer"
                                disabled={mediaPreparing || isSaving}
                                downloadName={formName || 'aram-media'}
                                orderingHelp="Σύρετε ή επιλέξτε εικόνα ή βίντεο για κεντρικό αρχείο προϊόντος. Το πρώτο αρχείο θα είναι το κεντρικό στο Shop."
                                onFiles={handleFileSelectShop}
                                onChange={setFormShopMediaList}
                                onReorder={(items, fromIndex, toIndex) => {
                                    if (fromIndex === 0 || toIndex === 0) refreshSmartSuggestionsFromMain(items);
                                }}
                                canEdit={media => media.type !== 'video' && !isAnimatedGifMedia(media)}
                                canRestore={canRestoreMediaOriginal}
                                onEdit={idx => openImageEditor('shop', idx)}
                                onRestore={idx => handleRestoreEditedMedia('shop', idx)}
                                onRemove={handleRemoveShopMedia}
                            >
                                <button type="button" onClick={handleRefreshSmartSuggestions} className="mt-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition">
                                    Ανανέωση smart suggestions από τη φόρμα
                                </button>
                                {smartSuggestions && (
                                    <div className="mt-3 border border-emerald-100 bg-emerald-50/60 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                                        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 mr-1">Smart suggestions</span>
                                                <p className="text-[11px] text-emerald-700/70 font-medium">{smartSuggestions.source}</p>
                                            </div>
                                            {smartSuggestions.description && (
                                                <button type="button" onClick={() => setFormNotes(smartSuggestions.description)} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition">
                                                    Χρήση περιγραφής
                                                </button>
                                            )}
                                            <button type="button" onClick={handleRefreshSmartSuggestions} className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition">
                                                Ανανέωση
                                            </button>
                                        </div>
                                        {smartSuggestions.category && (
                                            <button type="button" onClick={() => { setFormCategory(smartSuggestions.category); setIsCustomCategory(false); }} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition">
                                                {smartSuggestions.category}
                                            </button>
                                        )}
                                        {smartSuggestions.colors.map(color => (
                                            <button key={color} type="button" onClick={() => handleAddColor(color)} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition">
                                                {color}
                                            </button>
                                        ))}
                                        {smartSuggestions.description && (
                                            <p className="w-full text-xs text-emerald-900/75 bg-white/70 border border-emerald-100 rounded-lg p-3 leading-relaxed">{smartSuggestions.description}</p>
                                        )}
                                    </div>
                                )}

                            </MediaManager>
                        </section>

                        <section id="form-private-media" className="mt-6 scroll-mt-4 rounded-2xl border border-stone-300 bg-stone-100/70 p-4">
                            <h3 className="text-sm font-black text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-2 mb-4">Αρχειο (Μονο για το Back-Office)</h3>
                            <MediaManager
                                items={formPrivateMediaList}
                                variant="private"
                                uploadLabel="Προσωπικές φωτογραφίες και βίντεο που μένουν κρυφά"
                                uploadHelp={VIDEO_UPLOAD_HELP}
                                disabled={mediaPreparing || isSaving}
                                downloadName={formName || 'aram-private-media'}
                                onFiles={handleFileSelectPrivate}
                                onChange={setFormPrivateMediaList}
                                onReorder={items => refreshSmartSuggestionsFromMain(formShopMediaList, items)}
                                canEdit={media => media.type !== 'video' && !isAnimatedGifMedia(media)}
                                canRestore={canRestoreMediaOriginal}
                                onEdit={idx => openImageEditor('private', idx)}
                                onRestore={idx => handleRestoreEditedMedia('private', idx)}
                                onRemove={handleRemovePrivateMedia}
                            />
                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1">Περιγραφή / σημειώσεις προϊόντος</label>
                                <textarea className="w-full border border-stone-200 rounded-lg px-4 py-3 h-24 bg-white focus:bg-white outline-none resize-none" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Περιγραφή που μπορείς να επεξεργαστείς πριν εμφανιστεί στο shop..."></textarea>
                            </div>
                        </section>

                    </form>
                </div>
                <div className="p-5 border-t border-stone-100 bg-white rounded-b-2xl flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                    <button type="button" onClick={closeItemEditor} className="px-6 py-2.5 bg-stone-100 text-stone-700 rounded-lg font-bold hover:bg-stone-200 transition" disabled={isSaving || mediaPreparing}>Ακύρωση</button>
                    <button type="submit" form="jewelry-form" className="px-8 py-2.5 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-800 transition shadow-lg flex items-center gap-2" disabled={isSaving || mediaPreparing}>
                        Αποθήκευση
                    </button>
                </div>
            </div>
        </div>
    );
}
