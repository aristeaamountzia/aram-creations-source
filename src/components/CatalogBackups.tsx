import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import { notifyOperationSuccess, notifyOperationError } from '../lib/sound-notifications';

export function CatalogBackups() {
  const [list, setList] = useState<any[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function request(method = 'GET', params = new URLSearchParams(), signal?: AbortSignal) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Συνδέσου ξανά ως διαχειριστής.');
    const response = await fetch('/api/catalog-backups' + (params.size ? '?' + params : ''), { method, headers: { Authorization: `Bearer ${token}` }, signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || `Μη έγκυρη απόκριση backup (HTTP ${response.status}).`);
    return data;
  }
  async function refresh() {
    try { setList((await request()).backups); }
    catch (err: any) { setMessage(err.message); }
  }
  useEffect(() => { void refresh(); }, []);

  async function create() {
    const controller = new AbortController(); active.current?.abort(); active.current = controller;
    setBusy(true); setProgress(0); setMessage('1/2: Προετοιμασία αντιγράφου δεδομένων…');
    try {
      const { backup } = await request('POST', undefined, controller.signal);
      const started = Date.now();
      while (Date.now() - started < 16 * 60 * 1000) {
        const { job } = await request('GET', new URLSearchParams({ job: backup.jobId }), controller.signal);
        if (job.status === 'failed') throw new Error(job.error || 'Η εργασία backup τερματίστηκε χωρίς αποτέλεσμα.');
        if (job.status === 'complete' || job.status === 'partial') {
          setProgress(100);
          if (job.status === 'partial') {
            setMessage(`Αποθηκεύτηκαν τα δεδομένα, αλλά το αντίγραφο αρχείων είναι μερικό: ${job.error}`);
            notifyOperationError('Μερικό Backup', job.error);
          } else {
            setMessage(`Το πλήρες backup αποθηκεύτηκε με ${job.total} αρχεία.`);
            notifyOperationSuccess('Αντίγραφο Ασφαλείας', 'Αποθηκεύτηκαν τα δεδομένα και τα αρχεία media.');
          }
          await refresh(); return;
        }
        setProgress(job.total ? Math.round(job.processed * 100 / job.total) : 0);
        setMessage(job.status === 'media' ? `2/2: Αντιγραφή αρχείων ${job.processed}/${job.total} (${job.total ? Math.round(job.processed * 100 / job.total) : 0}%)` : '1/2: Αποθήκευση καταλόγων, παραγγελιών και ιστορικού…');
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new DOMException('Ακύρωση αναμονής.', 'AbortError')); };
          const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 2000);
          controller.signal.addEventListener('abort', abort, { once: true });
        });
      }
      throw new Error('Δεν επιβεβαιώθηκε ολοκλήρωση μέσα σε 16 λεπτά. Έλεγξε ξανά τη λίστα αντιγράφων.');
    } catch (err: any) {
      if (err.name !== 'AbortError') { setMessage(err.message); notifyOperationError('Σφάλμα Backup', err.message); }
    } finally { if (!controller.signal.aborted) { setBusy(false); active.current = null; } }
  }

  async function download(name: string) {
    setBusy(true);
    try {
      const { url } = await request('GET', new URLSearchParams({ name, link: '1' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `aram-${name}`; anchor.rel = 'noopener'; anchor.click();
      setMessage('Ξεκίνησε η λήψη του αντιγράφου.');
    } catch (err: any) { setMessage(err.message); notifyOperationError('Σφάλμα Λήψης Backup', err.message); }
    finally { setBusy(false); }
  }

  return <section className="my-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
    <h3 className="font-bold">Αντίγραφα ασφαλείας</h3>
    <p className="my-2 text-xs">Αυτόματα κάθε 30 λεπτά, με 24 ώρες και 7 ημερήσια στιγμιότυπα δεδομένων. Περιλαμβάνονται κατάλογοι, ρυθμίσεις, παραγγελίες, ιστορικό και ξεχωριστά αντίγραφα εικόνων/βίντεο. Η ένδειξη «Πλήρες» επιβεβαιώνει ότι αντιγράφηκαν όλα τα αναφερόμενα αρχεία.</p>
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
    <button disabled={busy} onClick={create} className="self-start rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50">Backup τώρα</button>
    <label className="flex min-w-0 max-w-full items-center gap-2 text-sm">Λήψη<select disabled={busy} value="" onChange={e => e.target.value && download(e.target.value)} className="min-w-0 w-full max-w-full rounded border bg-white p-2 sm:w-auto">
      <option value="">Επιλογή αντιγράφου ({list.length})</option>
      {list.map(row => <option key={row.name} value={row.name}>{new Date(row.createdAt).toLocaleString('el-GR')} · {row.name.startsWith('daily') ? 'Ημερήσιο' : '30 λεπτών'} · {row.mediaIncluded === 'true' ? 'Πλήρες' : row.format === 'aram-catalog-v2' ? 'Μερικό' : 'Δεδομένα μόνο'}</option>)}
    </select></label>
    </div>
    {busy && progress !== null && <progress className="block mt-3 w-full" max={100} value={progress} aria-label="Πρόοδος backup" />}
    <p role="status" className="mt-2 text-xs">{message}</p>
  </section>;
}
