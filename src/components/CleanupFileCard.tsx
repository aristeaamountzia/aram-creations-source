import { useEffect, useRef, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import { extractAllStoragePathsDeep, formatBytes, type StorageFileEntry, type FirestoreMediaDoc } from '../lib/firebase-media-cleanup';

export function CleanupFileCard({ file, canonical, selected, disabled, onToggle, documents }: {
  file: StorageFileEntry; canonical?: StorageFileEntry; selected: boolean; disabled: boolean; onToggle: () => void; documents: FirestoreMediaDoc[];
}) {
  const container = useRef<HTMLElement>(null);
  const [url, setUrl] = useState(file.downloadUrl || '');
  const [error, setError] = useState('');
  useEffect(() => {
    if (url || !container.current) return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      getDownloadURL(ref(storage, file.fullPath)).then(value => { if (active) setUrl(value); }).catch(() => { if (active) setError('Δεν φορτώθηκε η προεπισκόπηση. Το αρχείο διατηρείται αν δεν το επιλέξεις.'); });
    });
    observer.observe(container.current);
    return () => { active = false; observer.disconnect(); };
  }, [file.fullPath, url]);
  const usedBy = documents.filter(document => {
    const paths = new Set<string>(); extractAllStoragePathsDeep(document.raw, paths); return paths.has(file.fullPath);
  });
  return <article ref={container} className={`rounded-xl border p-3 space-y-2 ${selected ? 'border-rose-400 bg-rose-50' : 'border-stone-200'}`}>
    <div className="aspect-video bg-stone-100 rounded-lg overflow-hidden flex items-center justify-center">
      {url ? file.contentType?.startsWith('video/') ? <video src={url} controls preload="metadata" className="h-full w-full object-contain" /> : <a href={url} target="_blank" rel="noopener noreferrer" className="h-full w-full"><img src={url} alt={file.name} loading="lazy" className="h-full w-full object-contain" onError={() => setError('Η προεπισκόπηση δεν είναι διαθέσιμη. Άνοιξε το αρχείο από τον σύνδεσμο.')} /></a> : <span className="text-xs p-3">{error || 'Φόρτωση προεπισκόπησης…'}</span>}
    </div>
    <label className="flex gap-2 items-start text-xs font-bold"><input type="checkbox" disabled={disabled} checked={selected} onChange={onToggle} className="mt-1" /><span className="break-all">{file.fullPath}</span></label>
    <p className="text-xs text-stone-600">{formatBytes(file.size)} · {file.contentType || 'Άγνωστος τύπος'}{file.timeCreated && ` · ${new Date(file.timeCreated).toLocaleDateString('el-GR')}`}</p>
    <p className="text-xs">{usedBy.length ? `Χρησιμοποιείται: ${usedBy.map(document => `${document.collection} / ${document.title || document.id}`).join(', ')}` : 'Δεν βρέθηκε σύνδεση με καταχώρηση ή ρυθμίσεις.'}</p>
    {canonical && <p className="text-xs text-emerald-800 break-all">Αντίγραφο που διατηρείται: {canonical.fullPath}</p>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline">Άνοιγμα πρωτότυπου</a>}
    {error && <p role="status" className="text-xs text-amber-800">{error}</p>}
  </article>;
}
