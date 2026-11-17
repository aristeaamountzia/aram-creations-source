import { IconEye, IconX } from './icons';
import { BASE_CATEGORIES, BASE_STATUSES } from './catalog-config';
import type { VintedCatalog } from './useVintedCatalog';

type VintedImportDialogProps = Pick<
    VintedCatalog,
    'copyVintedImages' | 'handleFetchVintedLinks' | 'handleImportVintedItems' | 'isVintedImportOpen' |
    'isVintedImportWorking' | 'normalizeVintedPrice' | 'previewVintedImageSrc' | 'removeVintedPreviewItem' |
    'removeVintedPreviewMedia' | 'setCopyVintedImages' | 'setIsVintedImportOpen' | 'setVintedImportError' |
    'setVintedImportItems' | 'setVintedImportStatus' | 'setVintedLinksText' | 'setVintedPreviewImage' |
    'setVintedPricingSettings' | 'splitVintedList' | 'updateVintedPreviewItem' | 'vintedImportError' |
    'vintedImportItems' | 'vintedImportStatus' | 'vintedLinksText' | 'vintedPricingSettings'
>;

export function VintedImportDialog(props: VintedImportDialogProps) {
    const {
        copyVintedImages, handleFetchVintedLinks, handleImportVintedItems, isVintedImportOpen,
        isVintedImportWorking, normalizeVintedPrice, previewVintedImageSrc, removeVintedPreviewItem,
        removeVintedPreviewMedia, setCopyVintedImages, setIsVintedImportOpen, setVintedImportError,
        setVintedImportItems, setVintedImportStatus, setVintedLinksText, setVintedPreviewImage,
        setVintedPricingSettings, splitVintedList, updateVintedPreviewItem, vintedImportError,
        vintedImportItems, vintedImportStatus, vintedLinksText, vintedPricingSettings
    } = props;
    if (!(isVintedImportOpen)) return null;

    return (
        <div onClick={(e) => { if (e.target === e.currentTarget && !isVintedImportWorking) setIsVintedImportOpen(false); }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-stone-200 cursor-default animate-fade-in">
                <div className="p-5 border-b border-stone-100 bg-teal-50 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-stone-900">Vinted Import</h2>
                        <p className="text-xs md:text-sm font-bold text-stone-500 mt-1">Φέρε, έλεγξε και επεξεργάσου τα στοιχεία πριν τα αποθηκεύσεις στον κατάλογο.</p>
                    </div>
                    <button type="button" onClick={() => setIsVintedImportOpen(false)} className="text-stone-500 hover:text-stone-900 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
                </div>

                <div className="p-5 overflow-y-auto space-y-5">
                    <section className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-stone-600 mb-2">Vinted links</label>
                            <textarea
                                value={vintedLinksText}
                                onChange={(e) => setVintedLinksText(e.target.value)}
                                rows={5}
                                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-y"
                                placeholder="https://www.vinted.gr/items/..."
                            />
                        </div>

                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                                    <label className="flex items-start gap-2 text-xs font-bold text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={copyVintedImages}
                                    onChange={(e) => setCopyVintedImages(e.target.checked)}
                                    className="mt-0.5 accent-teal-700"
                                />
                                <span>Αντιγραφή εικόνων στο Firebase Storage πριν το import</span>
                                    </label>
                                    <p className="text-[11px] text-stone-500 leading-relaxed">Άφησέ το ενεργό για να μένουν οι εικόνες δικές σου και να φαίνονται σωστά στο Back Office και στο Shop.</p>
                                    <p className="text-[10px] text-amber-800 leading-relaxed">Προσοχή: οι χρεώσεις Vinted είναι ενδεικτικές και αφορούν το εκτιμώμενο συνολικό κόστος αγοραστή· επιβεβαίωσε την τιμή πριν την αποθήκευση.</p>
                                    <details className="rounded-lg border border-stone-200 bg-white p-3">
                                        <summary className="cursor-pointer text-xs font-black text-stone-700">Προσαρμογή τιμής Vinted</summary>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <label className="text-[10px] font-bold text-stone-600">Σταθερή χρέωση €
                                                <input type="number" min="0" step="0.01" value={vintedPricingSettings.buyerFixed} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, buyerFixed: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                            </label>
                                            <label className="text-[10px] font-bold text-stone-600">Ποσοστό %
                                                <input type="number" min="0" step="0.1" value={vintedPricingSettings.buyerPercent} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, buyerPercent: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                            </label>
                                            <label className="text-[10px] font-bold text-stone-600">Μεταφορικά €
                                                <input type="number" min="0" step="0.01" value={vintedPricingSettings.shippingMin} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, shippingMin: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs" />
                                            </label>
                                            <label className="text-[10px] font-bold text-stone-600">Στρογγυλοποίηση
                                                <select value={vintedPricingSettings.rounding} onChange={e => setVintedPricingSettings(prev => { const next = { ...prev, rounding: e.target.value }; localStorage.setItem('aram_vinted_fee_settings', JSON.stringify(next)); return next; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-xs">
                                                    <option value="up_050">Προς τα πάνω €0,50</option>
                                                    <option value="none">Χωρίς στρογγυλοποίηση</option>
                                                </select>
                                            </label>
                                        </div>
                                        <p className="text-[10px] leading-relaxed text-stone-500 mt-2">Η τιμή Shop υπολογίζεται από την τιμή Vinted + τις παραπάνω εκτιμώμενες χρεώσεις. Έλεγξέ την στην προεπισκόπηση πριν την αποθήκευση.</p>
                                    </details>
                                    <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleFetchVintedLinks}
                                    disabled={isVintedImportWorking}
                                    className="col-span-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-black hover:bg-stone-800 transition disabled:opacity-50"
                                >
                                    Φέρε στοιχεία
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setVintedImportItems([]); setVintedImportStatus(''); setVintedImportError(''); }}
                                    disabled={isVintedImportWorking || !vintedImportItems.length}
                                    className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-black hover:bg-stone-100 transition disabled:opacity-50"
                                >
                                    Καθαρισμός preview
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportVintedItems}
                                    disabled={isVintedImportWorking || !vintedImportItems.length}
                                    className="px-4 py-2.5 bg-teal-700 text-white rounded-lg text-xs font-black hover:bg-teal-800 transition disabled:opacity-50"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    </section>

                    {(vintedImportStatus || vintedImportError) && (
                        <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${vintedImportError ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                            {vintedImportError || vintedImportStatus}
                        </div>
                    )}

                    <section>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Preview προϊόντων</h3>
                            <span className="text-xs font-black text-stone-500">{vintedImportItems.length} προϊόντα</span>
                        </div>

                        {vintedImportItems.length === 0 ? (
                            <div className="border border-dashed border-stone-200 rounded-xl p-8 text-center text-sm font-bold text-stone-400">
                                Δεν έχεις τραβήξει ακόμα προϊόντα από Vinted links.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vintedImportItems.map((item, index) => {
                                    const mediaList = item.mediaList || [];
                                    return (
                                        <article key={`${item.sourceId || item.name}-${index}`} className="border border-stone-200 rounded-xl p-3 md:p-4 bg-white">
                                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                                <div className="grid grid-cols-4 gap-2 md:w-56 shrink-0">
                                                    {mediaList.map((media, mediaIndex) => (
                                                        <div key={`${media.url}-${mediaIndex}`} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                                                            <button
                                                                type="button"
                                                                className="absolute bottom-1 left-1 z-10 w-7 h-7 rounded-full bg-white/90 text-stone-800 flex items-center justify-center shadow border border-stone-200"
                                                                title="Άνοιγμα φωτογραφίας"
                                                                onClick={() => {
                                                                    const images = mediaList.filter(entry => entry.type !== 'video' && entry.url).map(entry => ({ url: previewVintedImageSrc(entry.url) }));
                                                                    if (images.length) setVintedPreviewImage({ images, index: images.findIndex(entry => entry.url === previewVintedImageSrc(media.url)), title: item.name || 'Vinted preview' });
                                                                }}
                                                            >
                                                                <IconEye />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                                                                title="Αφαίρεση φωτογραφίας"
                                                                onClick={() => removeVintedPreviewMedia(index, mediaIndex)}
                                                            >
                                                                <IconX />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="block w-full h-full"
                                                                title="Άνοιγμα φωτογραφίας"
                                                                onClick={() => {
                                                                    const images = mediaList.filter(entry => entry.type !== 'video' && entry.url).map(entry => ({ url: previewVintedImageSrc(entry.url) }));
                                                                    if (images.length) setVintedPreviewImage({ images, index: images.findIndex(entry => entry.url === previewVintedImageSrc(media.url)), title: item.name || 'Vinted preview' });
                                                                }}
                                                            >
                                                                <img referrerPolicy="no-referrer" src={previewVintedImageSrc(media.url)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {mediaList.length === 0 && (
                                                        <div className="col-span-4 aspect-[4/1] rounded-lg border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center p-2 text-center text-[11px] font-bold text-amber-900">
                                                            Δεν βρέθηκαν εικόνες. Έλεγξε το προϊόν πριν το import.
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">Preview edit</p>
                                                            <h4 className="font-black text-stone-900 truncate">{item.name || 'Χωρίς τίτλο'}</h4>
                                                            <p className="text-xs text-stone-500 mt-1">{item.price || 0}€ τιμή Shop · {item.vintedBasePrice || 0}€ Vinted · {item.category || 'Χωρίς κατηγορία'} · {mediaList.length} εικόνες</p>
                                                        </div>
                                                        <button type="button" onClick={() => removeVintedPreviewItem(index)} className="p-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-stone-500 transition" title="Αφαίρεση από preview">
                                                            <IconX />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τίτλος</span>
                                                            <input value={item.name || ''} onChange={e => updateVintedPreviewItem(index, { name: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τιμή Shop</span>
                                                            <input type="number" min="0" step="0.01" value={item.price ?? ''} onChange={e => updateVintedPreviewItem(index, { price: e.target.value, vintedPricing: item.vintedPricing ? { ...item.vintedPricing, sitePrice: normalizeVintedPrice(e.target.value), manuallyEdited: true } : null })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Τιμή βάσης Vinted</span>
                                                            <input type="number" min="0" step="0.01" value={item.vintedBasePrice ?? ''} onChange={e => updateVintedPreviewItem(index, { vintedBasePrice: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Likes Vinted</span>
                                                            <input type="number" min="0" step="1" value={item.vintedFavorites ?? 0} onChange={e => updateVintedPreviewItem(index, { vintedFavorites: Math.max(0, Number(e.target.value) || 0) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Views Vinted</span>
                                                            <input type="number" min="0" step="1" value={item.vintedViews ?? 0} onChange={e => updateVintedPreviewItem(index, { vintedViews: Math.max(0, Number(e.target.value) || 0) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Κατηγορία</span>
                                                            <select value={item.category || 'Άλλα'} onChange={e => updateVintedPreviewItem(index, { category: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white">
                                                                {[...new Set([...BASE_CATEGORIES, item.category].filter(Boolean))].map(category => <option key={category} value={category}>{category}</option>)}
                                                            </select>
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Κατάσταση</span>
                                                            <select value={item.status || 'Διαθέσιμο'} onChange={e => updateVintedPreviewItem(index, { status: e.target.value, stock: e.target.value === 'Πουλήθηκε' ? 0 : Math.max(1, Number(item.stock) || 1) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white">
                                                                {[...new Set([...BASE_STATUSES, item.status].filter(Boolean))].map(status => <option key={status} value={status}>{status}</option>)}
                                                            </select>
                                                        </label>
                                                        <label className="block md:col-span-2">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Περιγραφή</span>
                                                            <textarea value={item.description || ''} onChange={e => updateVintedPreviewItem(index, { description: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white min-h-24 resize-y" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Υλικά</span>
                                                            <input value={(item.materials || []).join(', ')} onChange={e => updateVintedPreviewItem(index, { materials: splitVintedList(e.target.value) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Χρώματα</span>
                                                            <input value={(item.colors || []).join(', ')} onChange={e => updateVintedPreviewItem(index, { colors: splitVintedList(e.target.value) })} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 outline-none focus:bg-white" />
                                                        </label>
                                                        <label className="block">
                                                            <span className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Φωτογραφίες</span>
                                                            <span className="block text-sm text-stone-700">{mediaList.length} στην προεπισκόπηση (έως 4 μικρογραφίες εμφανίζονται ανά προϊόν)</span>
                                                        </label>
                                                        {item.vintedPricing && <p className="md:col-span-2 text-[11px] text-stone-500">Εκτίμηση: {item.vintedBasePrice}€ + {item.vintedPricing.buyerFixed}€ + {Number(item.vintedPricing.buyerPercent).toFixed(1)}% + {item.vintedPricing.shippingMin}€ = {Number(item.vintedPricing.estimatedTotal).toFixed(2)}€, στρογγυλοποίηση {item.vintedPricing.rounding === 'none' ? 'καμία' : 'προς τα πάνω ανά 0,50€'}.</p>}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {(item.materials || []).slice(0, 5).map(material => (
                                                            <span key={`m-${material}`} className="text-[11px] font-bold px-2 py-1 bg-stone-100 text-stone-700 rounded-full">{material}</span>
                                                        ))}
                                                        {(item.colors || []).slice(0, 5).map(color => (
                                                            <span key={`c-${color}`} className="text-[11px] font-bold px-2 py-1 bg-teal-50 text-teal-800 rounded-full">{color}</span>
                                                        ))}
                                                    </div>

                                                    {item.notes && (
                                                        <p className="text-xs text-stone-500 leading-relaxed mt-3 line-clamp-2">{item.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <div className="p-5 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-end gap-3">
                    <button type="button" onClick={() => setIsVintedImportOpen(false)} className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm font-bold hover:bg-stone-100 transition">Κλείσιμο</button>
                    <button type="button" onClick={handleImportVintedItems} disabled={isVintedImportWorking || !vintedImportItems.length} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-black hover:bg-stone-800 transition disabled:opacity-50">
                        {isVintedImportWorking ? 'Δουλεύει...' : 'Import στο Back Office'}
                    </button>
                </div>
            </div>
        </div>
    );
}
