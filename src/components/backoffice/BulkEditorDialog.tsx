import { IconX } from './icons';
import { Check } from 'lucide-react';
import type { CatalogOptions } from './useCatalogOptions';
import type { CatalogBulk } from './useCatalogBulk';

type BulkEditorDialogProps = Pick<
    CatalogOptions,
    'allAvailableColors' | 'allAvailableMaterials' | 'allCollections' | 'allFormCategories' |
    'allFormStatuses'
> &
    Pick<
    CatalogBulk,
    'bulkCaseSensitive' | 'bulkColors' | 'bulkDraft' | 'bulkFindScopes' | 'bulkFindText' | 'bulkMaterials' |
    'bulkPriceAdjustmentMode' | 'bulkPriceAdjustmentValue' | 'bulkReplaceText' | 'bulkStock' | 'bulkTab' |
    'bulkTagMode' | 'bulkWholeWord' | 'clearBulkSelection' | 'clearBulkTags' | 'handleBulkFindAndReplace' |
    'handleBulkUpdate' | 'isBulkOpen' | 'selectedItems' | 'setBulkCaseSensitive' | 'setBulkDraft' |
    'setBulkFindScopes' | 'setBulkFindText' | 'setBulkPriceAdjustmentMode' | 'setBulkPriceAdjustmentValue' |
    'setBulkReplaceText' | 'setBulkStock' | 'setBulkTab' | 'setBulkTagMode' | 'setBulkWholeWord' |
    'setIsBulkOpen' | 'toggleBulkTag'
>;

export function BulkEditorDialog(props: BulkEditorDialogProps) {
    const {
        allAvailableColors, allAvailableMaterials, allCollections, allFormCategories, allFormStatuses,
        bulkCaseSensitive, bulkColors, bulkDraft, bulkFindScopes, bulkFindText, bulkMaterials,
        bulkPriceAdjustmentMode, bulkPriceAdjustmentValue, bulkReplaceText, bulkStock, bulkTab, bulkTagMode,
        bulkWholeWord, clearBulkSelection, clearBulkTags, handleBulkFindAndReplace, handleBulkUpdate,
        isBulkOpen, selectedItems, setBulkCaseSensitive, setBulkDraft, setBulkFindScopes, setBulkFindText,
        setBulkPriceAdjustmentMode, setBulkPriceAdjustmentValue, setBulkReplaceText, setBulkStock, setBulkTab,
        setBulkTagMode, setBulkWholeWord, setIsBulkOpen, toggleBulkTag
    } = props;
    if (!(isBulkOpen)) return null;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) setIsBulkOpen(false); }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-stone-200 cursor-default animate-fade-in"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex -space-x-2 overflow-hidden shrink-0">
                            {selectedItems.slice(0, 5).map((item) => (
                                <div key={item.id} className="w-10 h-10 rounded-lg border-2 border-white bg-stone-200 overflow-hidden shadow-sm">
                                    {item.imageUrl ? <img referrerPolicy="no-referrer" loading="lazy" decoding="async" src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-stone-300">ARAM</div>}
                                </div>
                            ))}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black text-stone-800 leading-tight">Μαζική επεξεργασία</h2>
                            <p className="text-xs font-bold text-stone-500">{selectedItems.length} επιλεγμένα προϊόντα</p>
                        </div>
                    </div>
                    <button onClick={() => setIsBulkOpen(false)} className="text-stone-400 hover:text-stone-800 bg-white p-2 rounded-lg border border-stone-200" title="Κλείσιμο (Esc)"><IconX /></button>
                </div>

                {/* Navigation Tabs */}
                <div className="px-5 py-2.5 border-b border-stone-200 bg-stone-50/90 flex flex-wrap items-center gap-2 shrink-0">
                    {[
                        ['fields', 'Βασικά Στοιχεία'],
                        ['search_replace', 'Εντοπισμός & Αντικατάσταση'],
                        ['pricing', 'Τιμές & Απόθεμα'],
                        ['tags', 'Χρώματα & Υλικά']
                    ].map(([tabId, label]) => (
                        <button
                            key={tabId}
                            type="button"
                            onClick={() => setBulkTab(tabId)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition border shadow-xs ${
                                bulkTab === tabId
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Body - Smooth Scroll */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                    {bulkTab === 'fields' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Μετακίνηση κατηγορίας</label>
                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.category} onChange={e => setBulkDraft({...bulkDraft, category: e.target.value})}>
                                        <option value="">Καμία αλλαγή</option>
                                        {allFormCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Συλλογή</label>
                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.collection} onChange={e => setBulkDraft({...bulkDraft, collection: e.target.value})}>
                                        <option value="">Καμία αλλαγή</option>
                                        {allCollections.map(col => <option key={col} value={col}>{col}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Κατάσταση πώλησης</label>
                                    <select className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkDraft.status} onChange={e => setBulkDraft({...bulkDraft, status: e.target.value})}>
                                        <option value="">Καμία αλλαγή</option>
                                        {allFormStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 mb-1">Απόθεμα (τεμάχια)</label>
                                    <input type="number" min="0" step="1" className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none" value={bulkStock} onChange={e => setBulkStock(e.target.value)} placeholder="Καμία αλλαγή" />
                                </div>
                            </div>

                            <div className="border border-amber-100 bg-amber-50/60 rounded-xl p-4">
                                <label className="block text-xs font-bold text-amber-800 mb-1">Σειρά εμφάνισης στο Shop</label>
                                <select className="w-full border border-amber-200 rounded-lg px-4 py-2.5 bg-white outline-none" value={bulkDraft.shopPlacement} onChange={e => setBulkDraft({...bulkDraft, shopPlacement: e.target.value})}>
                                    <option value="">Καμία αλλαγή</option>
                                    <option value="top">Μετακίνηση στην αρχή του Shop</option>
                                    <option value="up">Μετακίνηση μία θέση πάνω</option>
                                    <option value="down">Μετακίνηση μία θέση κάτω</option>
                                    <option value="bottom">Μετακίνηση στο τέλος του Shop</option>
                                </select>
                                <p className="mt-2 text-[11px] font-medium text-amber-700">Μετακινεί μαζί τα επιλεγμένα προϊόντα κρατώντας την ίδια σειρά μεταξύ τους.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 mb-1">Δημόσια περιγραφή προϊόντος</label>
                                <textarea className="w-full border border-stone-200 rounded-lg px-4 py-2.5 bg-stone-50 outline-none h-24 resize-y text-sm" value={bulkDraft.notes} onChange={e => setBulkDraft({...bulkDraft, notes: e.target.value})} placeholder="Καμία αλλαγή (ή εισάγετε νέες σημειώσεις για όλα)"></textarea>
                            </div>
                        </div>
                    )}

                    {bulkTab === 'search_replace' && (
                        <div className="space-y-5 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200">
                            <div>
                                <h3 className="text-sm font-black text-stone-900 mb-1">Μαζικός Εντοπισμός & Αντικατάσταση / Διαγραφή</h3>
                                <p className="text-xs text-stone-500">Εντοπίστε λέξεις ή φράσεις στα επιλεγμένα προϊόντα και αντικαταστήστε τις ή διαγράψτε τις αυτόματα.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">Λέξη / Φράση προς εύρεση *</label>
                                    <input
                                        type="text"
                                        value={bulkFindText}
                                        onChange={e => setBulkFindText(e.target.value)}
                                        className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-medium"
                                        placeholder="π.χ. παλιό κείμενο, ορχιδέα..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1">Αντικατάσταση με</label>
                                    <input
                                        type="text"
                                        value={bulkReplaceText}
                                        onChange={e => setBulkReplaceText(e.target.value)}
                                        className="w-full border border-stone-300 rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-medium"
                                        placeholder="Αφήστε κενό για απλή διαγραφή"
                                    />
                                </div>
                            </div>

                            <div>
                                <span className="block text-xs font-bold text-stone-700 mb-2">Πεδία εφαρμογής:</span>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        ['name', 'Τίτλος / Όνομα'],
                                        ['notes', 'Δημόσια περιγραφή προϊόντος'],
                                        ['materials', 'Υλικά'],
                                        ['colors', 'Χρώματα'],
                                        ['collection', 'Συλλογή']
                                    ].map(([field, label]) => (
                                        <label key={field} className="flex items-center gap-1.5 text-xs font-medium text-stone-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(bulkFindScopes[field])}
                                                onChange={e => setBulkFindScopes(prev => ({ ...prev, [field]: e.target.checked }))}
                                                className="accent-stone-900"
                                            />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-xs">
                                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                                    <input
                                        type="checkbox"
                                        checked={bulkCaseSensitive}
                                        onChange={e => setBulkCaseSensitive(e.target.checked)}
                                        className="accent-stone-900"
                                    />
                                    <span>Ταίριασμα πεζών/κεφαλαίων</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-stone-700">
                                    <input
                                        type="checkbox"
                                        checked={bulkWholeWord}
                                        onChange={e => setBulkWholeWord(e.target.checked)}
                                        className="accent-stone-900"
                                    />
                                    <span>Μόνο ολόκληρη λέξη</span>
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => handleBulkFindAndReplace(false)}
                                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                                >
                                    Αντικατάσταση στα {selectedItems.length} επιλεγμένα
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBulkFindAndReplace(true)}
                                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                >
                                    Διαγραφή λέξης από τα επιλεγμένα
                                </button>
                            </div>
                        </div>
                    )}

                    {bulkTab === 'pricing' && (
                        <div className="space-y-5">
                            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <h3 className="text-sm font-black text-emerald-900 mb-1">Άμεση Τιμολόγηση</h3>
                                <p className="text-xs text-emerald-700 mb-3">Ορίστε συγκεκριμένη σταθερή τιμή για όλα τα επιλεγμένα προϊόντα.</p>
                                <label className="block text-xs font-bold text-stone-700 mb-1">Νέα Τιμή (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full sm:w-60 border border-stone-200 rounded-lg px-4 py-2.5 bg-white outline-none focus:border-stone-900 text-sm font-bold"
                                    value={bulkDraft.price}
                                    onChange={e => setBulkDraft({...bulkDraft, price: e.target.value})}
                                    placeholder="π.χ. 25.00"
                                />
                            </div>

                            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
                                <h3 className="text-sm font-black text-amber-900">Μαζική Προσαρμογή Τιμών (+/- % ή €)</h3>
                                <p className="text-xs text-amber-700">Αυξήστε ή μειώστε τις υφιστάμενες τιμές κάθε προϊόντος κατά ποσοστό ή σταθερό ποσό.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-700 mb-1">Τρόπος προσαρμογής</label>
                                        <select
                                            value={bulkPriceAdjustmentMode}
                                            onChange={e => setBulkPriceAdjustmentMode(e.target.value)}
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-white text-xs font-bold outline-none"
                                        >
                                            <option value="none">Χωρίς σχετική προσαρμογή</option>
                                            <option value="percent_increase">Αύξηση κατά ποσοστό (%)</option>
                                            <option value="percent_decrease">Μείωση κατά ποσοστό (%)</option>
                                            <option value="fixed_increase">Αύξηση κατά σταθερό ποσό (€)</option>
                                            <option value="fixed_decrease">Μείωση κατά σταθερό ποσό (€)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-700 mb-1">Ποσό / Ποσοστό</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            disabled={bulkPriceAdjustmentMode === 'none'}
                                            value={bulkPriceAdjustmentValue}
                                            onChange={e => setBulkPriceAdjustmentValue(e.target.value)}
                                            placeholder="π.χ. 10 ή 5"
                                            className="w-full border border-stone-200 rounded-lg px-3 py-2 bg-white text-xs font-bold outline-none disabled:bg-stone-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {bulkTab === 'tags' && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700">
                                <span>Λειτουργία ετικετών:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="bulkTagMode" value="append" checked={bulkTagMode === 'append'} onChange={() => setBulkTagMode('append')} />
                                    <span>Προσθήκη</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="bulkTagMode" value="remove" checked={bulkTagMode === 'remove'} onChange={() => setBulkTagMode('remove')} />
                                    <span>Αφαίρεση</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="bulkTagMode" value="overwrite" checked={bulkTagMode === 'overwrite'} onChange={() => setBulkTagMode('overwrite')} />
                                    <span>Πλήρης αντικατάσταση</span>
                                </label>
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <label className="block text-xs font-bold text-indigo-700">Χρώματα</label>
                                    {bulkColors.length > 0 && (
                                        <button type="button" onClick={() => clearBulkTags('colors')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl max-h-36 overflow-auto">
                                    {allAvailableColors.map(col => {
                                        const isSelected = bulkColors.includes(col);
                                        return (
                                            <button key={col} type="button" onClick={() => toggleBulkTag('colors', col)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-indigo-700 border-indigo-700 text-white shadow-sm' : 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-100'}`}>
                                                <span className="inline-flex items-center gap-1">{isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : '+ '}{col}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <label className="block text-xs font-bold text-stone-700">Υλικά</label>
                                    {bulkMaterials.length > 0 && (
                                        <button type="button" onClick={() => clearBulkTags('materials')} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Καθαρισμός</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-stone-50 border border-stone-100 rounded-xl max-h-36 overflow-auto">
                                    {allAvailableMaterials.map(mat => {
                                        const isSelected = bulkMaterials.includes(mat);
                                        return (
                                            <button key={mat} type="button" onClick={() => toggleBulkTag('materials', mat)} className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition ${isSelected ? 'bg-stone-900 border-stone-900 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'}`}>
                                                <span className="inline-flex items-center gap-1">{isSelected ? <Check className="w-3 h-3 stroke-[2.5]" /> : '+ '}{mat}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (sticky) */}
                <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
                    <button onClick={clearBulkSelection} className="text-xs font-bold text-stone-500 hover:text-stone-800 transition">Ακύρωση & Αποεπιλογή</button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkOpen(false)} className="px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs sm:text-sm font-bold hover:bg-stone-100 transition">Κλείσιμο</button>
                        <button onClick={handleBulkUpdate} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-stone-800 transition shadow-md">Εφαρμογή στα {selectedItems.length}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
