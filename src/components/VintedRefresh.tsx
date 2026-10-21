import React, { useRef, useState } from 'react';
import { applyVintedRefresh } from '../lib/vinted-storage';
import { db } from '../firebase';
import { vintedRefreshPatch, chooseRefreshPatch, RefreshChoice } from '../lib/vinted-refresh';

type Row = { choices?: RefreshChoice; item: any; patch: any; notes: string[]; error?: string; selected: boolean; result?: string; checkedAt?: string; remotePrice?: unknown; remoteAvailability?: string };
const notifyDone = () => { try { const Ctx = window.AudioContext || (window as any).webkitAudioContext; const ctx = new Ctx(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(0.04, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.18); } catch {} };
export function VintedRefresh({ items, sourceUrl, endpoint, pricing, statuses = ['Διαθέσιμο', 'Κρατημένο', 'Πουλήθηκε', 'Μη διαθέσιμο', 'Δωρίστηκε', 'Προσωπική Συλλογή', 'Υπό Κατασκευή'] }: { statuses?: string[]; items: any[]; sourceUrl: (item: any) => string; endpoint: string; pricing: (amount: number) => any }) {
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
          setRows(prev => [...prev, { item, ...update, choices: { price: 'price' in update.patch, availability: 'status' in update.patch || 'stock' in update.patch, favorites: 'vintedFavorites' in update.patch, views: 'vintedViews' in update.patch, images: 'mediaList' in update.patch, priceValue: String(update.patch.price ?? item.price ?? ''), statusValue: update.patch.status || item.status || 'Διαθέσιμο', stockValue: String(Math.min(1, Math.max(0, Number(update.patch.stock ?? item.stock ?? 1)))) }, selected: Object.keys(update.patch).length > 0, checkedAt: new Date().toLocaleTimeString('el-GR'), remotePrice: payload.item.priceKnown ? payload.item.price : undefined, remoteAvailability: payload.item.availabilityKnown ? payload.item.isSold ? 'Πουλήθηκε' : payload.item.isReserved ? 'Κρατημένο' : payload.item.availability === 'available' ? 'Διαθέσιμο' : 'Μη διαθέσιμο' : 'Δεν επιβεβαιώθηκε' }]);
        } catch (error: any) {
          if (controller.signal.aborted) break;
          setRows(prev => [...prev, { item, patch: {}, notes: [], error: error.message, selected: false }]);
        }
        if (i < selected.length - 1 && !controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 2000));
      }
      const complete = controller.signal.aborted ? 'Ο έλεγχος σταμάτησε. Δεν αποθηκεύτηκε καμία αλλαγή.' : 'Έλεγχος ολοκληρώθηκε — δες με πράσινο τις αλλαγές και επίλεξε ποιες θα αποθηκευτούν.';
      setProgress(complete); if (!controller.signal.aborted) notifyDone();
    } finally { setBusy(false); abort.current = null; }
  }
  async function apply() {
    setApplying(true); let saved = 0, failed = 0;
    for (const row of rows.filter(row => row.selected && !row.error && !row.result)) {
      try {
        const chosen = chooseRefreshPatch(row.item, row.patch, row.choices!);
        if (!Object.keys(chosen).length) { setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: false, result: 'Καμία επιλεγμένη αλλαγή.' } : r)); continue; }
        await applyVintedRefresh(db, row.item.id, row.item, chosen);
        saved++; setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: false, result: 'Αποθηκεύτηκε' } : r));
      } catch (error: any) {
        failed++; setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: false, error: error.message } : r));
      }
    }
    setProgress(`Αποθηκεύτηκαν ${saved} προϊόντα.${failed ? ` Δεν ενημερώθηκαν ${failed} προϊόντα· δες τα μηνύματα.` : ''}`); if (saved) notifyDone(); setApplying(false);
  }
  function updateChoice(row: Row, changed: Partial<RefreshChoice>) { setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: true, choices: { ...r.choices!, ...changed } } : r)); }
  const labels: Record<string, string> = { price: 'Τιμή shop', stock: 'Απόθεμα', status: 'Κατάσταση', vintedBasePrice: 'Τιμή Vinted', vintedFavorites: 'Αγαπημένα Vinted', vintedViews: 'Προβολές Vinted', mediaList: 'Φωτογραφίες Vinted' };
  return <>
    <button onClick={inspect} disabled={!candidates.length || busy || applying} title="Επίλεξε προϊόντα με Vinted link. Έως 50 ανά έλεγχο." className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold disabled:opacity-50">Έλεγχος / Ανανέωση Vinted ({candidates.length})</button>
    {open && <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="vinted-refresh-heading">
      <div className="w-full max-w-3xl max-h-[90dvh] bg-white rounded-2xl flex flex-col shadow-xl">
        <div className="p-5 border-b"><h2 id="vinted-refresh-heading" className="text-lg font-bold">Ανανέωση από Vinted</h2><p className="text-sm text-stone-600 mt-2">Πρώτα ελέγχουμε, μετά αποθηκεύεις. Τίτλοι, περιγραφές, φωτογραφίες και τοπικά αγαπημένα δεν αλλάζουν. Επίλεξε ξεχωριστά κάθε αλλαγή. Μπορείς να γράψεις δική σου τιμή shop ή να διορθώσεις την κατάσταση πριν αποθηκεύσεις.</p>{candidates.length > 50 && <p className="text-sm text-amber-700">Θα ελεγχθούν τα πρώτα 50 επιλεγμένα προϊόντα.</p>}<p role="status" aria-live="polite" className="text-sm font-bold mt-3">{progress}</p></div>
        <div className="overflow-y-auto p-4 space-y-3 min-h-0">{rows.map(row => <div key={row.item.id} className={`border rounded-xl p-3 ${Object.keys(row.patch).length && !row.error ? "border-emerald-300 bg-emerald-50/40" : "border-stone-200"}`}>
          <label className="flex items-center gap-3 font-bold text-sm"><input type="checkbox" checked={row.selected} disabled={busy || applying || !!row.error || !!row.result} onChange={e => setRows(prev => prev.map(r => r.item.id === row.item.id ? { ...r, selected: e.target.checked } : r))} />{row.item.name || row.item.id}</label>
          {row.checkedAt && <p className="text-xs text-stone-600 mt-2">Έλεγχος {row.checkedAt} · Τιμή Vinted: {row.remotePrice === undefined ? 'Δεν επιβεβαιώθηκε' : `${row.remotePrice} €`} · Κατάσταση Vinted: {row.remoteAvailability}</p>}
          {row.choices && !row.error && <fieldset disabled={busy || applying || !!row.result} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <label className="flex flex-wrap items-center gap-2"><input type="checkbox" aria-label={`Αποδοχή τιμής ${row.item.name}`} checked={row.choices.price} onChange={e => updateChoice(row, { price: e.target.checked })} />Τιμή shop<input aria-label={`Τιμή shop ${row.item.name}`} type="number" min="0.01" max="100000" step="0.01" value={row.choices.priceValue} onChange={e => updateChoice(row, { price: true, priceValue: e.target.value })} className="w-24 rounded border p-2" /> €<span className="text-xs text-stone-500">Τρέχουσα: {row.item.price} €</span></label>
            <div className="space-y-2"><label className="flex gap-2"><input type="checkbox" aria-label={`Αποδοχή κατάστασης ${row.item.name}`} disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q)>0)} checked={row.choices.availability} onChange={e => updateChoice(row, { availability: e.target.checked })} />Κατάσταση / απόθεμα</label><select aria-label={`Κατάσταση ${row.item.name}`} value={row.choices.statusValue} disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q)>0)} onChange={e => updateChoice(row,{ availability: true, statusValue: e.target.value, stockValue: ['Πουλήθηκε','Μη διαθέσιμο','Δωρίστηκε'].includes(e.target.value) ? '0' : '1' })} className="max-w-full rounded border p-2">{Array.from(new Set([...statuses, row.choices.statusValue])).map(status => <option key={status}>{status}</option>)}</select><select aria-label={`Απόθεμα ${row.item.name}`} disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q)>0)} value={row.choices.stockValue} onChange={e => updateChoice(row,{ availability: true, stockValue: e.target.value })} className="ml-2 rounded border p-2"><option value="0">0 τεμάχια</option><option value="1">1 τεμάχιο</option></select><p className="text-xs text-stone-500">Τρέχουσα: {row.item.status} · {row.item.stock ?? 1} τεμ.</p></div>
            {row.patch.mediaList && <label className="sm:col-span-2 rounded-lg border border-emerald-200 bg-white p-2 text-emerald-900"><span className="flex items-center gap-2"><input type="checkbox" checked={row.choices.images} onChange={e => updateChoice(row, { images: e.target.checked })} />Νέες φωτογραφίες από Vinted ({row.patch.mediaList.length})</span><span className="mt-2 flex gap-1 overflow-x-auto">{row.patch.mediaList.slice(0, 6).map((media: any, index: number) => <img key={media.url} src={media.url} alt={`Νέα φωτογραφία ${index + 1}`} className="h-12 w-12 rounded object-cover" />)}</span></label>}
            {(['vintedFavorites','vintedViews'] as const).filter(key => row.patch[key] !== undefined).map(key => <label key={key} className="flex gap-2"><input type="checkbox" checked={key === 'vintedFavorites' ? row.choices!.favorites : row.choices!.views} onChange={e => updateChoice(row, key === 'vintedFavorites' ? { favorites: e.target.checked } : { views: e.target.checked })} />{labels[key]}: {row.item[key] ?? '—'} → {row.patch[key]}</label>)}
          </fieldset>}
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

