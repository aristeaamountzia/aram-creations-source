import React, { useRef, useState } from 'react';
import { applyVintedRefresh } from '../lib/vinted-storage';
import { db } from '../firebase';
import { vintedRefreshPatch } from '../lib/vinted-refresh';

type Row = { item: any; patch: any; notes: string[]; error?: string; selected: boolean; result?: string; checkedAt?: string; remotePrice?: unknown; remoteAvailability?: string };
export function VintedRefresh({ items, sourceUrl, endpoint, pricing }: { items: any[]; sourceUrl: (item: any) => string; endpoint: string; pricing: (amount: number) => any }) {
  const [open, setOpen] = useState(false), [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false), [applying, setApplying] = useState(false), [progress, setProgress] = useState('');
  const abort = useRef<AbortController | null>(null);
  const candidates = items.filter(item => sourceUrl(item));
  async function inspect() {
    const selected = candidates.slice(0, 50).map(item => structuredClone(item));
    setRows([]); setOpen(true); setBusy(true); setProgress('Ανάκτηση στοιχείων…');
    const controller = new AbortController(); abort.current = controller;
    try {
      for (let i = 0; i < selected.length && !controller.signal.aborted; i++) {
        setProgress(`Έλεγχος ${i + 1} / ${selected.length}`);
        const item = selected[i];
        try {
          const response = await fetch(`${endpoint}?refresh=1&url=${encodeURIComponent(sourceUrl(item))}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35000)]), cache: 'no-store' });
          const payload = await response.json().catch(() => { throw new Error('Ο server δεν επέστρεψε έγκυρα στοιχεία.'); });
          if (!response.ok || !payload.ok || !payload.item) throw new Error(payload.error || `Σφάλμα ${response.status}`);
          const expectedId = new URL(sourceUrl(item)).pathname.match(/\/items\/(\d+)/)?.[1];
          if (!expectedId || String(payload.item.id) !== expectedId) throw new Error('Τα στοιχεία δεν αντιστοιχούν στο επιλεγμένο Vinted link.');
          const update = vintedRefreshPatch(item, payload.item, pricing(Number(payload.item.price)));
          setRows(prev => [...prev, { item, ...update, selected: Object.keys(update.patch).length > 0, checkedAt: new Date().toLocaleTimeString('el-GR'), remotePrice: payload.item.priceKnown ? payload.item.price : undefined, remoteAvailability: payload.item.availabilityKnown ? payload.item.isSold ? 'Πουλήθηκε' : payload.item.isReserved ? 'Κρατημένο' : payload.item.availability === 'available' ? 'Διαθέσιμο' : 'Μη διαθέσιμο' : 'Δεν επιβεβαιώθηκε' }]);
        } catch (error: any) {
          if (controller.signal.aborted) break;
          setRows(prev => [...prev, { item, patch: {}, notes: [], error: error.message, selected: false }]);
        }
        if (i < selected.length - 1 && !controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setProgress(controller.signal.aborted ? 'Ο έλεγχος σταμάτησε. Δεν αποθηκεύτηκε καμία αλλαγή.' : 'Έλεγξε τις αλλαγές και επίλεξε ποιες θα αποθηκευτούν.');
    } finally { setBusy(false); abort.current = null; }
  }
  async function apply() {
    setApplying(true); let saved = 0, failed = 0;
    for (const row of rows.filter(row => row.selected && !row.error && !row.result)) {
      try {
        await applyVintedRefresh(db, row.item.id, row.item, row.patch);
        saved++; setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: false, result: 'Αποθηκεύτηκε' } : r));
      } catch (error: any) {
        failed++; setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: false, error: error.message } : r));
      }
    }
    setProgress(`Αποθηκεύτηκαν ${saved} προϊόντα.${failed ? ` Δεν ενημερώθηκαν ${failed} προϊόντα· δες τα μηνύματα.` : ''}`); setApplying(false);
  }
  const labels: Record<string, string> = { price: 'Τιμή shop', stock: 'Απόθεμα', status: 'Κατάσταση', vintedBasePrice: 'Τιμή Vinted', vintedFavorites: 'Αγαπημένα Vinted', vintedViews: 'Προβολές Vinted' };
  return <>
    <button onClick={inspect} disabled={!candidates.length || busy || applying} title="Επίλεξε προϊόντα με Vinted link. Έως 50 ανά έλεγχο." className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold disabled:opacity-50">Έλεγχος / Ανανέωση Vinted ({candidates.length})</button>
    {open && <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="vinted-refresh-heading">
      <div className="w-full max-w-3xl max-h-[90dvh] bg-white rounded-2xl flex flex-col shadow-xl">
        <div className="p-5 border-b"><h2 id="vinted-refresh-heading" className="text-lg font-bold">Ανανέωση από Vinted</h2><p className="text-sm text-stone-600 mt-2">Πρώτα ελέγχουμε, μετά αποθηκεύεις. Τίτλοι, περιγραφές, φωτογραφίες και τοπικά αγαπημένα δεν αλλάζουν. Η τιμή shop περιλαμβάνει τις ρυθμίσεις χρεώσεων Vinted που έχεις ορίσει.</p>{candidates.length > 50 && <p className="text-sm text-amber-700">Θα ελεγχθούν τα πρώτα 50 επιλεγμένα προϊόντα.</p>}<p role="status" aria-live="polite" className="text-sm font-bold mt-3">{progress}</p></div>
        <div className="overflow-y-auto p-4 space-y-3 min-h-0">{rows.map(row => <div key={row.item.id} className="border rounded-xl p-3">
          <label className="flex items-center gap-3 font-bold text-sm"><input type="checkbox" checked={row.selected} disabled={busy || applying || !!row.error || !!row.result || !Object.keys(row.patch).length} onChange={e => setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: e.target.checked } : r))} />{row.item.name || row.item.id}</label>
          {row.checkedAt && <p className="text-xs text-stone-600 mt-2">Έλεγχος {row.checkedAt} · Τιμή Vinted: {row.remotePrice === undefined ? 'Δεν επιβεβαιώθηκε' : `${row.remotePrice} €`} · Κατάσταση Vinted: {row.remoteAvailability}</p>}
          {Object.entries(row.patch).filter(([key]) => labels[key]).map(([key, value]) => <p key={key} className="text-sm mt-1">{labels[key]}: {String(row.item[key] ?? '—')} → <strong>{String(value)}</strong>{key === 'vintedBasePrice' || key === 'price' ? ' €' : ''}</p>)}
          {!Object.keys(row.patch).length && !row.error && <p className="text-sm text-stone-500 mt-2">Καμία αλλαγή στα διαθέσιμα στοιχεία.</p>}
          {row.notes.map(note => <p key={note} className="text-xs text-amber-800 mt-2">{note}</p>)}
          {row.error && <p role="alert" className="text-sm text-rose-700 mt-2">{row.error} Δεν αποθηκεύτηκε αλλαγή για αυτό το προϊόν.</p>}
          {row.result && <p className="text-sm text-emerald-700 mt-2">{row.result}</p>}
        </div>)}</div>
        <div className="p-4 border-t flex flex-wrap justify-end gap-3">{busy ? <button onClick={() => abort.current?.abort()} className="px-4 py-2 border rounded-lg">Διακοπή ελέγχου</button> : <button disabled={applying} onClick={() => setOpen(false)} className="px-4 py-2 border rounded-lg">Κλείσιμο</button>}<button onClick={apply} disabled={busy || applying || !rows.some(row => row.selected && !row.error && !row.result)} className="px-4 py-2 rounded-lg bg-stone-900 text-white disabled:opacity-40">{applying ? 'Αποθήκευση…' : `Αποθήκευση αλλαγών (${rows.filter(r => r.selected).length})`}</button></div>
      </div>
    </div>}
  </>;
}


