import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
export function CatalogBackups() {
  const [list, setList] = useState<any[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function request(method = 'GET', name = '') {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/catalog-backups' + (name ? `?name=${encodeURIComponent(name)}` : ''), { method, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Δεν ολοκληρώθηκε το backup. Έλεγξε τη σύνδεση και δοκίμασε ξανά.');
    return response;
  }
  async function refresh() { try { setList((await (await request()).json()).backups); } catch (err: any) { setMessage(err.message); } }
  useEffect(() => { void refresh(); }, []);
  async function create() {
    setBusy(true); setMessage('Δημιουργία backup…');
    try { await request('POST'); setMessage('Το backup αποθηκεύτηκε.'); await refresh(); } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  }
  async function download(name: string) {
    setBusy(true);
    try { const blob = await (await request('GET', name)).blob(); const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = `aram-${name.replace('.gz','')}`; a.click(); setTimeout(() => URL.revokeObjectURL(href), 60000); } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  }
  return <section className="my-3 rounded-xl border border-teal-200 bg-teal-50 p-4"><h3 className="font-bold">Αντίγραφα ασφαλείας</h3><p className="my-2 text-xs">Αυτόματα κάθε 30 λεπτά. Διατηρούνται 24 ώρες και 7 ημερήσια αντίγραφα. Περιλαμβάνονται κατάλογοι, ρυθμίσεις και παραγγελίες, με συνδέσμους media. Τα αρχεία εικόνων και βίντεο δεν αντιγράφονται.</p><button disabled={busy} onClick={create} className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50">Backup τώρα</button><label className="ml-2 inline-flex gap-2 text-sm">Λήψη<select disabled={busy} value="" onChange={e => e.target.value && download(e.target.value)} className="min-w-0 max-w-full rounded border bg-white p-2"><option value="">Επιλογή αντιγράφου ({list.length})</option>{list.map(row => <option key={row.name} value={row.name}>{new Date(row.createdAt).toLocaleString('el-GR')} · {row.name.startsWith('daily') ? 'Ημερήσιο' : '30 λεπτών'}</option>)}</select></label><p role="status" className="mt-2 text-xs">{message}</p></section>;
}
