import React from 'react';
import { CatalogBackups } from '../CatalogBackups';
import { IconX } from './icons';
import type { CatalogHistoryController } from './useCatalogHistory';

type Props = Pick<CatalogHistoryController, 'isHistoryOpen' | 'setIsHistoryOpen' | 'versionHistory' | 'setVersionHistory' | 'historySaveError' | 'handleRestoreHistoryEntry' | 'canRestoreHistoryEntry'>;

export function CatalogHistoryDialog({ isHistoryOpen, setIsHistoryOpen, versionHistory, setVersionHistory, historySaveError, handleRestoreHistoryEntry, canRestoreHistoryEntry }: Props) {
    if (!isHistoryOpen) return null;
    return (
    <div onClick={(e) => { if (e.target === e.currentTarget) setIsHistoryOpen(false); }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 cursor-pointer overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-stone-200 cursor-default animate-fade-in">
            <div className="p-5 border-b border-stone-100 bg-amber-50 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-stone-800">Ιστορικό εκδόσεων</h2>
                    <p className="text-xs font-bold text-stone-500">Τελευταίες {versionHistory.length} αλλαγές. Οι νέες καταγραφές αποθηκεύονται ιδιωτικά στο cloud· το παλαιότερο τοπικό ιστορικό παραμένει σε αυτόν τον browser.</p>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="text-stone-500 hover:text-stone-900 bg-white p-1 rounded-lg border border-stone-200"><IconX /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
                <CatalogBackups />
    {historySaveError && <p role="alert" className="p-3 text-sm text-rose-700">{historySaveError}</p>}
    {versionHistory.length === 0 && (
                    <div className="text-center p-10 text-stone-400 font-bold border border-dashed border-stone-200 rounded-xl">Δεν υπάρχει ακόμη ιστορικό εκδόσεων.</div>
                )}
                {versionHistory.map((entry, idx) => (
                    <div key={`${entry.timestamp}-${entry.id}-${idx}`} className="border border-stone-200 rounded-xl p-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{entry.type}</span>
                                <span className="text-xs text-stone-400">{new Date(entry.timestamp).toLocaleString('el-GR')}</span>
                            </div>
                            <p className="font-black text-stone-800">{entry.name || 'Προϊόν'}</p>
                            <p className="text-xs text-stone-500">{entry.message || 'Αλλαγή έκδοσης'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleRestoreHistoryEntry(entry)} disabled={!canRestoreHistoryEntry(entry)} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed">
                                    Επαναφορά
                                </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-5 border-t border-stone-100 bg-stone-50 flex justify-between gap-3">
                <button onClick={() => { if (window.confirm('Να καθαριστεί μόνο το τοπικό ιστορικό; Οι εγγραφές cloud διατηρούνται.')) { setVersionHistory(previous => previous.filter(entry => entry.cloudId)); localStorage.removeItem('aram_version_history'); } }} className="px-4 py-2 bg-white border border-stone-200 text-stone-500 rounded-lg text-xs font-bold hover:bg-stone-100 transition">Καθαρισμός τοπικού ιστορικού</button>
                <button onClick={() => setIsHistoryOpen(false)} className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-stone-800 transition">Κλείσιμο</button>
            </div>
        </div>
    </div>
    );
}
