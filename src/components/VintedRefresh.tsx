import React, { useRef, useState, useEffect } from 'react';
import { applyVintedRefresh } from '../lib/vinted-storage';
import { db } from '../firebase';
import { vintedRefreshPatch, chooseRefreshPatch, RefreshChoice } from '../lib/vinted-refresh';

type Row = {
  choices?: RefreshChoice;
  item: any;
  patch: any;
  notes: string[];
  error?: string;
  selected: boolean;
  result?: string;
  checkedAt?: string;
  remotePrice?: unknown;
  remoteAvailability?: string;
};

const notifyDone = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
  } catch {}
};

export function VintedRefresh({
  items,
  sourceUrl,
  endpoint,
  pricing,
  statuses = ['Διαθέσιμο', 'Κρατημένο', 'Πουλήθηκε', 'Μη διαθέσιμο', 'Δωρίστηκε', 'Προσωπική Συλλογή', 'Υπό Κατασκευή']
}: {
  statuses?: string[];
  items: any[];
  sourceUrl: (item: any) => string;
  endpoint: string;
  pricing: (amount: number) => any;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState('');
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'changes' | 'all' | 'unchanged' | 'errors'>('all');
    const abort = useRef<AbortController | null>(null);
  const candidates = items.filter(item => sourceUrl(item));

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !applying) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, applying]);
  async function inspect() {
    const selected = candidates.slice(0, 50).map(item => structuredClone(item));
    setRows([]);
    setOpen(true);
    setBusy(true);
    setCurrentProgress({ current: 0, total: selected.length });
    setProgress('Εκκίνηση ανάκτησης στοιχείων Vinted…');
    const controller = new AbortController();
    abort.current = controller;
    try {
      for (let i = 0; i < selected.length && !controller.signal.aborted; i++) {
        setCurrentProgress({ current: i + 1, total: selected.length });
        setProgress(`Έλεγχος ${i + 1} από ${selected.length} προϊόντα...`);
        const item = selected[i];
        try {
          const response = await fetch(`${endpoint}?refresh=1&url=${encodeURIComponent(sourceUrl(item))}`, {
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35000)]),
            cache: 'no-store'
          });
          const payload = await response.json().catch(() => {
            throw new Error('Ο server δεν επέστρεψε έγκυρη απάντηση JSON.');
          });
          if (!response.ok || !payload.ok || !payload.item) {
            throw new Error(payload.error || `Σφάλμα απόκρισης διακομιστή (${response.status})`);
          }
          const expectedId = new URL(sourceUrl(item)).pathname.match(/\/items\/(\d+)/)?.[1];
          if (!expectedId || String(payload.item.id) !== expectedId) {
            throw new Error('Τα στοιχεία δεν αντιστοιχούν στο επιλεγμένο Vinted link.');
          }
          const update = vintedRefreshPatch(item, payload.item, pricing(Number(payload.item.price)));
          const hasAnyChange = Object.keys(update.patch).length > 0;
          setRows(prev => [
            ...prev,
            {
              item,
              ...update,
              choices: {
                price: 'price' in update.patch,
                availability: 'status' in update.patch || 'stock' in update.patch,
                favorites: 'vintedFavorites' in update.patch,
                views: 'vintedViews' in update.patch,
                images: 'mediaList' in update.patch,
                priceValue: String(update.patch.price ?? item.price ?? ''),
                statusValue: update.patch.status || item.status || 'Διαθέσιμο',
                stockValue: String(Math.min(1, Math.max(0, Number(update.patch.stock ?? item.stock ?? 1))))
              },
              selected: hasAnyChange,
              checkedAt: new Date().toLocaleTimeString('el-GR'),
              remotePrice: payload.item.priceKnown ? payload.item.price : undefined,
              remoteAvailability: payload.item.availabilityKnown
                ? payload.item.isSold
                  ? 'Πουλήθηκε'
                  : payload.item.isReserved
                  ? 'Κρατημένο'
                  : payload.item.availability === 'available'
                  ? 'Διαθέσιμο'
                  : 'Μη διαθέσιμο'
                : 'Δεν επιβεβαιώθηκε'
            }
          ]);
        } catch (error: any) {
          if (controller.signal.aborted) break;
          setRows(prev => [...prev, { item, patch: {}, notes: [], error: error.message, selected: false }]);
        }
        if (i < selected.length - 1 && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      const complete = controller.signal.aborted
        ? 'Ο έλεγχος διακόπηκε από τον χρήστη. Δεν αποθηκεύτηκε καμία αλλαγή.'
        : 'Ο έλεγχος ολοκληρώθηκε επιτυχώς! Επιλέξτε ποιες αλλαγές θέλετε να εφαρμοστούν.';
      setProgress(complete);
      if (!controller.signal.aborted) notifyDone();
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  async function apply() {
    setApplying(true);
    let saved = 0,
      failed = 0;
    for (const row of rows.filter(row => row.selected && !row.error && !row.result)) {
      try {

        const chosen = chooseRefreshPatch(row.item, row.patch, row.choices!);
        if (!Object.keys(chosen).length) {
          setRows(prev =>
            prev.map(r => (r.item.id === row.item.id ? { ...r, selected: false, result: 'Καμία επιλεγμένη αλλαγή.' } : r))
          );
          continue;
        }
        await applyVintedRefresh(db, row.item.id, row.item, chosen);
        saved++;
        setRows(prev =>
          prev.map(r => (r.item.id === row.item.id ? { ...r, selected: false, result: 'Αποθηκεύτηκε επιτυχώς' } : r))
        );
      } catch (error: any) {
        failed++;
        setRows(prev =>
          prev.map(r => (r.item.id === row.item.id ? { ...r, selected: false, error: error.message } : r))
        );
      }
    }
    setProgress(
      `Αποθηκεύτηκαν ${saved} προϊόντα.${failed ? ` Δεν ενημερώθηκαν ${failed} προϊόντα· δείτε τα μηνύματα σφάλματος.` : ''}`
    );
    if (saved) notifyDone();
    setApplying(false);
  }

  function updateChoice(row: Row, changed: Partial<RefreshChoice>) {
    setRows(prev =>
      prev.map(r =>
        r.item.id === row.item.id ? { ...r, selected: true, choices: { ...r.choices!, ...changed } } : r
      )
    );
  }

  const labels: Record<string, string> = {
    price: 'Τιμή shop',
    stock: 'Απόθεμα',
    status: 'Κατάσταση',
    vintedBasePrice: 'Τιμή Vinted',
    vintedFavorites: 'Αγαπημένα Vinted',
    vintedViews: 'Προβολές Vinted',
    mediaList: 'Φωτογραφίες Vinted'
  };

  const withChanges = rows.filter(r => Object.keys(r.patch).length > 0 && !r.error);
  const unchanged = rows.filter(r => Object.keys(r.patch).length === 0 && !r.error);
  const withErrors = rows.filter(r => !!r.error);

  const displayedRows = activeTab === 'changes' ? withChanges
    : activeTab === 'unchanged' ? unchanged
    : activeTab === 'errors' ? withErrors
    : rows;

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          onClick={inspect}
          disabled={!candidates.length || busy || applying}
          title="Επίλεξε προϊόντα με Vinted link. Έως 50 ανά έλεγχο."
          className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-amber-100 transition shadow-sm flex items-center gap-1.5"
        >
          
          <span>Έλεγχος / Ανανέωση Vinted ({candidates.length})</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vinted-refresh-heading"
          onClick={e => {
            if (e.target === e.currentTarget && !busy && !applying) setOpen(false);
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-stone-200 cursor-default animate-fade-in"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  
                  <h2 id="vinted-refresh-heading" className="text-lg font-black text-stone-900">
                    Ανανέωση από Vinted
                  </h2>
                </div>

                <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
                  <b>Απόλυτη ασφάλεια:</b> Τίτλοι, περιγραφές, χρώματα και υλικά <u>δεν αλλάζουν ποτέ</u> αυτόματα. Ελέγχονται μόνο η τιμή και η διαθεσιμότητα στο Vinted, και εσείς επιλέγετε ξεχωριστά κάθε αλλαγή.
                </p>

                {/* Progress bar */}
                {busy && currentProgress && (
                  <div className="space-y-1 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                      <span>Έλεγχος {currentProgress.current} από {currentProgress.total} προϊόντα...</span>
                      <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((currentProgress.current / currentProgress.total) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {progress && !busy && (
                  <p role="status" aria-live="polite" className="text-xs font-bold text-stone-800 bg-stone-100 px-3 py-1.5 rounded-lg inline-block">
                    {progress}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={busy || applying}
                onClick={() => setOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-800 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition disabled:opacity-40"
                title="Κλείσιμο (Escape)"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs Bar */}
            {rows.length > 0 && (
              <div className="px-4 py-2 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('changes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'changes' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span>Μόνο με αλλαγές</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'changes' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'}`}>
                      {withChanges.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'all' ? 'bg-stone-900 text-white shadow-sm' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span>Όλα</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'}`}>
                      {rows.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('unchanged')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'unchanged' ? 'bg-stone-700 text-white shadow-sm' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span>Αμετάβλητα</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'unchanged' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'}`}>
                      {unchanged.length}
                    </span>
                  </button>

                  {withErrors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('errors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'errors' ? 'bg-rose-700 text-white shadow-sm' : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      <span>Σφάλματα</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        {withErrors.length}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRows(prev => prev.map(r => Object.keys(r.patch).length > 0 && !r.error ? { ...r, selected: true } : r))}
                    className="text-stone-600 hover:text-stone-900 underline font-bold"
                  >
                    Επιλογή όλων με αλλαγές
                  </button>
                  <span className="text-stone-300">·</span>
                  <button
                    type="button"
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))}
                    className="text-stone-500 hover:text-stone-900 underline font-medium"
                  >
                    Αποεπιλογή
                  </button>
                </div>
              </div>
            )}

            {/* Body: Product rows */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 flex-1 min-h-0 bg-stone-50/50">
              {rows.length === 0 && busy && (
                <div className="text-center py-16 text-stone-500 space-y-3">
                  <div className="text-3xl animate-spin inline-block">⏳</div>
                  <p className="text-sm font-bold text-stone-800">Έλεγχος συνδέσμων Vinted σε εξέλιξη...</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Ανακτούμε ζωντανά τις τιμές και τη διαθεσιμότητα χωρίς να αγγίζουμε τις περιγραφές σας.
                  </p>
                </div>
              )}

              {displayedRows.length === 0 && rows.length > 0 && (
                <div className="text-center py-12 text-stone-500 bg-white rounded-xl border border-stone-200">
                  <p className="text-sm font-bold text-stone-700">Δεν υπάρχουν προϊόντα σε αυτή την καρτέλα.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="mt-2 text-xs font-bold text-stone-900 underline"
                  >
                    Προβολή όλων ({rows.length})
                  </button>
                </div>
              )}

              {displayedRows.map(row => {
                const previewImg = row.item.imageUrl || row.item.image || row.item.mediaList?.[0]?.url;
                const hasChanges = Object.keys(row.patch).length > 0 && !row.error;
                const priceDiff = row.choices?.priceValue && row.item.price
                  ? Number(row.choices.priceValue) - Number(row.item.price)
                  : 0;

                return (
                  <div
                    key={row.item.id}
                    className={`border rounded-2xl p-4 sm:p-5 transition bg-white shadow-sm space-y-3.5 ${
                      hasChanges ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-stone-200'
                    }`}
                  >
                    {/* Top Row: Checkbox, Thumbnail, Title & Status */}
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={busy || applying || !!row.error || !!row.result}
                        onChange={e =>
                          setRows(prev =>
                            prev.map(r => (r.item.id === row.item.id ? { ...r, selected: e.target.checked } : r))
                          )
                        }
                        className="w-5 h-5 rounded border-stone-300 accent-emerald-600 mt-1 cursor-pointer shrink-0"
                      />

                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                        {previewImg ? (
                          <img src={previewImg} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-stone-400 font-bold uppercase">ARAM</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-stone-900 truncate">
                            {row.item.name || row.item.id}
                          </span>
                          {row.item.status && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 uppercase">
                              {row.item.status}
                            </span>
                          )}
                          {hasChanges ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Εντοπίστηκαν αλλαγές
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
                              Αμετάβλητο
                            </span>
                          )}
                        </div>

                        {row.checkedAt && (
                          <p className="text-xs text-stone-500">
                            Έλεγχος: {row.checkedAt} · Vinted Τιμή:{' '}
                            <span className="font-bold text-stone-800">
                              {row.remotePrice === undefined ? '—' : `${row.remotePrice} €`}
                            </span>{' '}
                            · Vinted Κατάσταση:{' '}
                            <span className="font-bold text-stone-800">{row.remoteAvailability}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* What Stays Unchanged Guarantee Banner */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600">
                      
                      <span><b>Παραμένουν αναλλοίωτα:</b> Τίτλος, Περιγραφή, Χρώματα, Υλικά, Συλλογή.</span>
                    </div>

                    {/* Visual Diff Cards */}
                    {hasChanges && row.choices && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {'price' in row.patch && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                              <span>Αλλαγή Τιμής Shop</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                {priceDiff > 0 ? `+${priceDiff.toFixed(2)} €` : `${priceDiff.toFixed(2)} €`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="line-through text-stone-400">{row.item.price} €</span>
                              <span className="text-stone-400">→</span>
                              <span className="font-black text-emerald-800 text-sm">{row.choices.priceValue} €</span>
                            </div>
                          </div>
                        )}

                        {('status' in row.patch || 'stock' in row.patch) && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                              <span>Κατάσταση / Απόθεμα</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                                {row.choices.statusValue}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-700">
                              <span className="text-stone-400">{row.item.status} ({row.item.stock ?? 1} τεμ.)</span>
                              <span className="text-stone-400">→</span>
                              <span className="font-black text-amber-950">{row.choices.statusValue} ({row.choices.stockValue} τεμ.)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Choices Form */}
                    {row.choices && !row.error && (
                      <fieldset disabled={busy || applying || !!row.result} className="pt-2 border-t border-stone-100 grid gap-3 text-sm sm:grid-cols-2">
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.choices.price}
                            onChange={e => updateChoice(row, { price: e.target.checked })}
                            className="w-4 h-4 rounded border-stone-300 accent-emerald-600"
                          />
                          <span className="font-bold text-xs text-stone-800">Εφαρμογή τιμής shop:</span>
                          <input
                            type="number"
                            min="0.01"
                            max="100000"
                            step="0.01"
                            value={row.choices.priceValue}
                            onChange={e => updateChoice(row, { price: true, priceValue: e.target.value })}
                            className="w-24 rounded-lg border border-stone-300 p-1.5 text-xs font-bold"
                          />{' '}
                          €
                        </label>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q) > 0)}
                              checked={row.choices.availability}
                              onChange={e => updateChoice(row, { availability: e.target.checked })}
                              className="w-4 h-4 rounded border-stone-300 accent-emerald-600"
                            />
                            <span className="font-bold text-xs text-stone-800">Εφαρμογή κατάστασης:</span>
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={row.choices.statusValue}
                              disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q) > 0)}
                              onChange={e =>
                                updateChoice(row, {
                                  availability: true,
                                  statusValue: e.target.value,
                                  stockValue: ['Πουλήθηκε', 'Μη διαθέσιμο', 'Δωρίστηκε'].includes(e.target.value) ? '0' : '1'
                                })
                              }
                              className="rounded-lg border border-stone-300 p-1.5 text-xs font-medium bg-white"
                            >
                              {Array.from(new Set([...statuses, row.choices.statusValue])).map(status => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                            <select
                              disabled={Object.values(row.item.checkoutReservations || {}).some(q => Number(q) > 0)}
                              value={row.choices.stockValue}
                              onChange={e => updateChoice(row, { availability: true, stockValue: e.target.value })}
                              className="rounded-lg border border-stone-300 p-1.5 text-xs font-medium bg-white"
                            >
                              <option value="0">0 τεμάχια</option>
                              <option value="1">1 τεμάχιο</option>
                            </select>
                          </div>
                        </div>

                        {row.patch.mediaList &&
                          (() => {
                            const newUrls = new Set(row.patch.__vintedNewMediaUrls || []);
                            const newMedia = row.patch.mediaList.filter((media: any) => newUrls.has(media.url));
                            return (
                              <label className="sm:col-span-2 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-emerald-950 block">
                                <span className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                                  <input
                                    type="checkbox"
                                    checked={row.choices.images}
                                    onChange={e => updateChoice(row, { images: e.target.checked })}
                                    className="w-4 h-4 rounded border-stone-300 accent-emerald-600"
                                  />
                                  Νέες φωτογραφίες από Vinted ({newMedia.length})
                                </span>
                                <span className="mt-1 block text-xs text-emerald-800">
                                  Προστίθενται στην υπάρχουσα συλλογή· δεν αντικαθιστούν τις φωτογραφίες που έχετε ήδη.
                                </span>
                                <span className="mt-2.5 flex gap-2 overflow-x-auto">
                                  {newMedia.map((media: any, index: number) => (
                                    <span key={media.url} className="relative shrink-0">
                                      <img
                                        src={media.url}
                                        alt={`Νέα φωτογραφία ${index + 1}`}
                                        className="h-20 w-20 rounded-lg border-2 border-emerald-500 object-cover shadow-sm"
                                      />
                                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm">
                                        ΝΕΑ
                                      </span>
                                    </span>
                                  ))}
                                </span>
                              </label>
                            );
                          })()}

                        {(['vintedFavorites', 'vintedViews'] as const)
                          .filter(key => row.patch[key] !== undefined)
                          .map(key => (
                            <label key={key} className="flex items-center gap-2 text-xs text-stone-700">
                              <input
                                type="checkbox"
                                checked={key === 'vintedFavorites' ? row.choices!.favorites : row.choices!.views}
                                onChange={e =>
                                  updateChoice(row, key === 'vintedFavorites' ? { favorites: e.target.checked } : { views: e.target.checked })
                                }
                                className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                              />
                              {labels[key]}: {row.item[key] ?? '—'} → {row.patch[key]}
                            </label>
                          ))}
                      </fieldset>
                    )}

                    {!Object.keys(row.patch).length && !row.error && (
                      <p className="text-xs text-stone-400">Όλα τα στοιχεία είναι πλήρως συγχρονισμένα.</p>
                    )}

                    {row.notes.map(note => (
                      <p key={note} className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        ℹ️ {note}
                      </p>
                    ))}

                    {row.error && (
                      <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          
                          <span>Αποτυχία ελέγχου Vinted</span>
                        </div>
                        <p>{row.error}</p>
                        <p className="text-[11px] text-stone-500 pt-1 border-t border-rose-100">
                          Δεν πραγματοποιήθηκε καμία αλλαγή. Ελέγξτε αν ο σύνδεσμος του Vinted είναι ενεργός.
                        </p>
                      </div>
                    )}

                    {row.result && (
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                        
                        <span>{row.result}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs font-bold text-stone-600">
                {rows.filter(r => r.selected).length > 0 ? (
                  <span>Επιλεγμένα για ενημέρωση: <b>{rows.filter(r => r.selected).length}</b></span>
                ) : (
                  <span>Καμία επιλεγμένη αλλαγή</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {busy ? (
                  <button
                    type="button"
                    onClick={() => abort.current?.abort()}
                    className="px-5 py-2.5 border border-stone-300 bg-white hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 transition"
                  >
                    Διακοπή ελέγχου
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 border border-stone-300 bg-white hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 transition disabled:opacity-40"
                  >
                    Κλείσιμο
                  </button>
                )}

                <button
                  type="button"
                  onClick={apply}
                  disabled={busy || applying || !rows.some(row => row.selected && !row.error && !row.result)}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition disabled:opacity-40 shadow-md flex items-center gap-1.5"
                >
                  {applying ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Αποθήκευση…</span>
                    </>
                  ) : (
                    <span>Αποθήκευση αλλαγών ({rows.filter(r => r.selected && !r.error && !r.result).length})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
