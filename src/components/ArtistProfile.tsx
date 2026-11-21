import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';
import { auth } from '../firebase';

type Profile = { biography: string; cvName: string; hasCv: boolean };
const linktree = 'https://linktr.ee/aristeaamnt';
async function readProfile(signal?: AbortSignal): Promise<Profile> {
  const response = await fetch('/api/artist-profile', { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Δεν φορτώθηκε η παρουσίαση.');
  return data;
}

export function ArtistProfileDialog({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    readProfile(controller.signal).then(setProfile).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button,a[href]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { controller.abort(); document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[90] bg-stone-950/70 p-4 flex items-center justify-center" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="artist-profile-title" className="studio-dialog max-w-2xl w-full max-h-[85svh] overflow-y-auto border p-6 sm:p-10 bg-white text-stone-900 shadow-xl">
      <div className="flex justify-between items-start gap-4 border-b pb-5 mb-6"><div><p className="text-sm text-stone-600 mb-2">Aristea Amountzia</p><h2 id="artist-profile-title" className="studio-dialog-title">Βιογραφικό</h2></div><button type="button" onClick={onClose} aria-label="Κλείσιμο παρουσίασης" className="min-h-11 min-w-11 flex items-center justify-center"><X className="w-5 h-5" /></button></div>
      {!profile && !error && <p role="status" className="animate-pulse text-sm">Φόρτωση παρουσίασης…</p>}
      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
      {profile?.biography && <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{profile.biography}</p>}
      <div className="mt-8 flex flex-wrap gap-5 border-t pt-5 text-sm">
        {profile?.hasCv && <a href="/api/artist-profile?cv=1" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4"><FileText className="w-4 h-4" />Βιογραφικό (PDF)</a>}
        <a href={linktree} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4">Όλοι οι σύνδεσμοί μου<ExternalLink className="w-4 h-4" /></a>
      </div>
    </div>
  </div>;
}

export function ArtistProfileEditor() {
  const [profile, setProfile] = useState<Profile>({ biography: '', cvName: '', hasCv: false });
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const load = async () => {
    setLoading(true); setError('');
    try { setProfile(await readProfile()); setLoaded(true); } catch (error: any) { setError(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Συνδέσου ως διαχειριστής.');
      const form = new FormData(); form.set('biography', profile.biography); form.set('removeCv', String(remove)); if (file) form.set('cv', file);
      const response = await fetch('/api/artist-profile', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(45000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Δεν αποθηκεύτηκε η παρουσίαση.');
      setProfile(data); setFile(null); setRemove(false); if (input.current) input.current.value = ''; setMessage('Η παρουσίαση αποθηκεύτηκε και είναι διαθέσιμη στο About me.');
    } catch (error: any) { setError(error.message); } finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
    <h3 className="font-bold text-sm">About me · Παρουσίαση & Βιογραφικό</h3>
    <p className="text-xs text-stone-600">Εμφανίζεται από τον διακριτικό σύνδεσμο στο υποσέλιδο Shop και Portfolio. Η παρουσίαση αποθηκεύεται ξεχωριστά με το παρακάτω κουμπί.</p>
    {loading ? <p role="status" className="text-xs">Φόρτωση…</p> : <>
      <label className="block text-xs space-y-2"><span>Κείμενο παρουσίασης</span><textarea disabled={busy || !loaded} value={profile.biography} maxLength={12000} rows={6} onChange={event => setProfile({ ...profile, biography: event.target.value })} className="w-full border rounded-lg p-3" /></label>
      <label className="block text-xs space-y-2"><span>Βιογραφικό PDF (έως 3 MB, δημοσίως διαθέσιμο)</span><input ref={input} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => { const next = event.target.files?.[0]; setMessage(''); if (next && next.size > 3 * 1024 * 1024) { setError('Το PDF πρέπει να είναι έως 3 MB.'); event.target.value = ''; setFile(null); return; } setError(''); setFile(next || null); setRemove(false); }} className="block w-full" /></label>
      {profile.hasCv && <div className="text-xs space-y-2"><a href="/api/artist-profile?cv=1" target="_blank" rel="noopener noreferrer" className="underline">Τρέχον βιογραφικό: {profile.cvName}</a><label className="flex gap-2 items-center"><input type="checkbox" disabled={busy || Boolean(file)} checked={remove} onChange={event => setRemove(event.target.checked)} />Αφαίρεση δημοσιευμένου βιογραφικού</label></div>}
      <p className="text-xs">Linktree: <a href={linktree} target="_blank" rel="noopener noreferrer" className="underline">{linktree}</a></p>
      <button type="button" disabled={busy || !loaded} onClick={save} className="rounded-lg px-4 py-2 bg-stone-900 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Αποθήκευση…' : 'Αποθήκευση παρουσίασης'}</button>
    </>}
    {error && <div role="alert" className="text-xs text-rose-700">{error}<button type="button" onClick={load} className="underline ml-2">Επανάληψη φόρτωσης</button></div>}
    {message && <p role="status" className="text-xs text-emerald-800">{message}</p>}
  </section>;
}
