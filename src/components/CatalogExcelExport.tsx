import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ART_ITEMS, CATEGORIES } from '../data';
import { sortPortfolio } from '../lib/portfolio-order';

export function CatalogExcelExport() {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; filename: string; total: number; embedded: number; missing: string[] } | null>(null);
  const operation = useRef<AbortController | null>(null), downloadUrl = useRef('');
  useEffect(() => () => { operation.current?.abort(); if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current); }, []);
  const exportExcel = async () => {
    if (busy) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setProgress('Φόρτωση καταλόγων…'); setError(''); setResult(null);
    try {
      if (!auth.currentUser) throw new Error('Συνδέσου στο Back Office.');
      const [shopSnapshot, portfolioSnapshot, exporter, thumbnails] = await Promise.all([
        getDocs(collection(db, 'jewelry')), getDocs(collection(db, 'portfolio')),
        import('../lib/catalog-excel'), import('../lib/excel-thumbnail'),
      ]);
      controller.signal.throwIfAborted();
      const shop = shopSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a: any, b: any) => (a.shopOrder ?? Number.MAX_SAFE_INTEGER) - (b.shopOrder ?? Number.MAX_SAFE_INTEGER));
      const merged = new Map<string, any>(ART_ITEMS.map(item => [item.id, { ...item }]));
      portfolioSnapshot.docs.forEach(doc => merged.set(doc.id, { ...merged.get(doc.id), ...doc.data(), id: doc.id }));
      const portfolio = sortPortfolio([...merged.values()]).map(item => ({ ...item, categoryTitle: CATEGORIES.find(c => c.id === item.category)?.title || item.category }));
      const output = await exporter.buildCatalogExcel({ shop, portfolio, loadThumbnail: thumbnails.loadExcelThumbnail, signal: controller.signal,
        onProgress: p => setProgress(p.stage === 'file' ? 'Δημιουργία Excel…' : `Μικρογραφίες ${p.completed}/${p.total}`),
      });
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      const url = URL.createObjectURL(new Blob([output.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      downloadUrl.current = url;
      const filename = `aram-creations-${new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })}.xlsx`;
      setResult({ url, filename, total: output.total, embedded: output.embedded, missing: output.missing });
      const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    } catch (error: any) { setError(controller.signal.aborted ? 'Η εξαγωγή ακυρώθηκε.' : `Δεν δημιουργήθηκε το Excel: ${error.message}`); }
    finally { setBusy(false); setProgress(''); operation.current = null; }
  };
  return <div className="flex flex-col items-start gap-1 max-w-full">
    <div className="flex flex-wrap gap-2 items-center">
      <button type="button" disabled={busy} onClick={exportExcel} title="Όλος ο κατάλογος Shop και Portfolio, με ενσωματωμένες μικρογραφίες" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-60">{busy ? progress : 'Excel με εικόνες'}</button>
      {busy && <button type="button" onClick={() => operation.current?.abort()} className="text-xs underline text-stone-600">Ακύρωση εξαγωγής</button>}
    </div>
    {busy && <span role="status" className="text-xs text-stone-500">Περιλαμβάνονται όλες οι καταχωρήσεις Shop και Portfolio.</span>}
    {error && <span role="alert" className="max-w-xs text-xs text-rose-700">{error}</span>}
    {result && <div role="status" className="max-w-xs text-xs text-stone-600"><a href={result.url} download={result.filename} className="font-bold underline text-teal-800">Λήψη Excel</a> · {result.total} καταχωρήσεις, {result.embedded} μικρογραφίες.{result.missing.length > 0 && <details className="mt-1 text-amber-800"><summary>{result.missing.length} μικρογραφίες δεν φορτώθηκαν — τα στοιχεία διατηρήθηκαν</summary><ul className="mt-1 max-h-32 overflow-auto list-disc pl-4">{result.missing.map((name, index) => <li key={index}>{name}</li>)}</ul></details>}</div>}
  </div>;
}
