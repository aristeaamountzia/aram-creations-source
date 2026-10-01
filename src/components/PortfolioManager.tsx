import { MediaDownload } from './MediaDownload';
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { ART_ITEMS, CATEGORIES } from '../data';
import { ArtItem, CategoryId } from '../types';

type PortfolioRecord = ArtItem & { isDeleted?: boolean; name?: string; imageUrl?: string; deletedAt?: unknown };
type Media = { url: string; type: 'image' | 'video'; title?: string };
type EditorTab = 'basics' | 'details' | 'media' | 'ai';

const emptyForm = () => ({
  id: '', title: '', category: 'handcrafted-memories' as CategoryId,
  year: String(new Date().getFullYear()), medium: '', dimensions: '', origin: '', status: 'Διαθέσιμο',
  description: '', detailsText: '', featured: false, inquiryOnly: true, mediaList: [] as Media[]
});

export const PortfolioManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [remote, setRemote] = useState<PortfolioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'active' | 'archived'>('active');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('basics');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ title?: string; description?: string } | null>(null);
  const [aiWorking, setAiWorking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => onSnapshot(collection(db, 'portfolio'), snapshot => {
    setRemote(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as PortfolioRecord)));
    setLoading(false);
    setError('');
  }, err => { setLoading(false); setError(`Δεν φορτώθηκε το Portfolio: ${err.message}`); }), []);

  const allItems = useMemo(() => {
    const merged = new Map<string, PortfolioRecord>(ART_ITEMS.map(item => [item.id, item]));
    remote.forEach(item => merged.set(item.id, { ...merged.get(item.id), ...item } as PortfolioRecord));
    return Array.from(merged.values());
  }, [remote]);

  const items = useMemo(() => allItems.filter(item => {
    const archived = Boolean(item.isDeleted || item.deletedAt);
    return archived === (visibilityFilter === 'archived')
      && (categoryFilter === 'all' || item.category === categoryFilter)
      && `${item.title || item.name} ${item.description || ''} ${item.medium || ''}`.toLocaleLowerCase('el').includes(query.toLocaleLowerCase('el'));
  }), [allItems, visibilityFilter, categoryFilter, query]);

  const selectedItems = items.filter(item => selectedIds.includes(item.id));

  const edit = (item: PortfolioRecord) => {
    const mediaList = Array.isArray(item.mediaList) && item.mediaList.length
      ? item.mediaList.map(media => ({ url: media.url, type: media.type === 'video' ? 'video' : 'image' } as Media))
      : [item.imageUrl || item.image ? { url: item.imageUrl || item.image, type: item.videoUrl === (item.imageUrl || item.image) ? 'video' : 'image' } as Media : null,
          item.videoUrl && item.videoUrl !== (item.imageUrl || item.image) ? { url: item.videoUrl, type: 'video' } as Media : null].filter(Boolean) as Media[];
    setForm({ id: item.id, title: item.title || item.name || '', category: item.category,
      year: item.year || '', medium: item.medium || '', dimensions: item.dimensions || '',
      origin: item.origin || '', status: item.status || 'Διαθέσιμο', description: item.description || '',
      detailsText: (item.details || []).join('\n'), featured: Boolean(item.featured),
      inquiryOnly: item.inquiryOnly !== false, mediaList });
    setEditorTab('basics');
    setAiSuggestion(null);
    setError('');
  };

  const addMediaUrl = () => {
    const url = newMediaUrl.trim();
    if (!/^https:\/\//i.test(url)) { setError('Το URL αρχείου πρέπει να αρχίζει με https://'); return; }
    const type: Media['type'] = /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image';
    setForm(current => current && ({ ...current, mediaList: [...current.mediaList, { url, type }] }));
    setNewMediaUrl(''); setError('');
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !form) return;
    setUploading(true); setError('');
    try {
      const uploaded: Media[] = [];
      for (const file of Array.from(files)) {
        if (!/^(image|video)\//.test(file.type) || file.size > 30 * 1024 * 1024) throw new Error('Επιτρέπονται εικόνες ή βίντεο έως 30 MB ανά αρχείο.');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'media';
        const fileRef = ref(storage, `jewelry/portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`);
        await uploadBytes(fileRef, file, { contentType: file.type });
        uploaded.push({ url: await getDownloadURL(fileRef), type: file.type.startsWith('video/') ? 'video' : 'image', title: file.name });
      }
      setForm(current => current && ({ ...current, mediaList: [...current.mediaList, ...uploaded] }));
    } catch (err: any) { setError(`Δεν ανέβηκε το αρχείο: ${err.message}`); }
    finally { setUploading(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    if (!form.title.trim()) { setError('Χρειάζεται τίτλος έργου.'); setEditorTab('basics'); return; }
    if (!form.mediaList.length) { setError('Χρειάζεται τουλάχιστον μία εικόνα ή βίντεο.'); setEditorTab('media'); return; }
    setSaving(true); setError('');
    try {
      const first = form.mediaList[0];
      const record = {
        title: form.title.trim(), name: form.title.trim(), category: form.category,
        year: form.year.trim(), medium: form.medium.trim(), dimensions: form.dimensions.trim(),
        origin: form.origin.trim(), status: form.status.trim(), description: form.description.trim(),
        details: form.detailsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
        featured: form.featured, inquiryOnly: form.inquiryOnly,
        image: first.url, imageUrl: first.url, fileType: first.type,
        mediaList: form.mediaList, videoUrl: first.type === 'video' ? first.url : (form.mediaList.find(media => media.type === 'video')?.url || ''),
        isDeleted: false, deletedAt: null, updatedAt: serverTimestamp()
      };
      if (form.id) await setDoc(doc(db, 'portfolio', form.id), record, { merge: true });
      else await addDoc(collection(db, 'portfolio'), { ...record, createdAt: serverTimestamp() });
      setForm(null);
    } catch (err: any) { setError(`Δεν αποθηκεύτηκε: ${err.message}`); }
    finally { setSaving(false); }
  };

  const remove = async (item: PortfolioRecord) => {
    if (!window.confirm(`Να αφαιρεθεί το έργο «${item.title || item.name}» από το Portfolio;`)) return;
    try { await setDoc(doc(db, 'portfolio', item.id), { isDeleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); }
    catch (err: any) { setError(`Δεν αφαιρέθηκε: ${err.message}`); }
  };

  const restore = async (item: PortfolioRecord) => {
    try {
      const remoteItem = remote.find(record => record.id === item.id);
      if (ART_ITEMS.some(staticItem => staticItem.id === item.id) && !remoteItem?.title) await deleteDoc(doc(db, 'portfolio', item.id));
      else await setDoc(doc(db, 'portfolio', item.id), { isDeleted: false, deletedAt: null, updatedAt: serverTimestamp() }, { merge: true });
    }
    catch (err: any) { setError(`Δεν έγινε επαναφορά: ${err.message}`); }
  };

  const bulkArchive = async () => {
    if (!selectedItems.length || !window.confirm(`Να αρχειοθετηθούν ${selectedItems.length} έργα;`)) return;
    try {
      const batch = writeBatch(db);
      selectedItems.forEach(item => batch.set(doc(db, 'portfolio', item.id), { isDeleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }));
      await batch.commit(); setSelectedIds([]);
    } catch (err: any) { setError(`Δεν ολοκληρώθηκε η μαζική αρχειοθέτηση: ${err.message}`); }
  };

  const exportCsv = () => {
    const columns = ['id', 'title', 'category', 'year', 'medium', 'dimensions', 'origin', 'status', 'description', 'featured', 'inquiryOnly', 'image'];
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [columns.join(','), ...items.map(item => columns.map(key => quote((item as any)[key])).join(','))].join('\r\n');
    const href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = href; link.download = 'aram-portfolio.csv'; link.click(); URL.revokeObjectURL(href);
  };

  const generateAiSuggestion = async (task: 'full' | 'title' | 'description') => {
    if (!form) return;
    setAiWorking(true); setError(''); setAiSuggestion(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Συνδέσου ξανά ως διαχειριστής.');
      const response = await fetch('/api/backoffice-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: 'portfolio_item', task, prompt: aiPrompt, product: { name: form.title, category: form.category, year: form.year, medium: form.medium, dimensions: form.dimensions, description: form.description } })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Το AI endpoint δεν απάντησε σωστά.');
      setAiSuggestion({ title: data.title, description: data.description });
    } catch (err: any) { setError(`AI: ${err.message}`); }
    finally { setAiWorking(false); }
  };

  return <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-5 pb-20">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div><div className="flex items-center gap-2"><button type="button" onClick={onBack} className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-bold">Shop</button><span className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white">Portfolio</span></div><p className="mt-2 text-xs text-stone-500">{allItems.filter(item => !item.isDeleted && !item.deletedAt).length} ενεργά έργα · {allItems.filter(item => item.isDeleted || item.deletedAt).length} στο αρχείο</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold">Εξαγωγή CSV</button><button type="button" onClick={() => { setForm(emptyForm()); setEditorTab('basics'); setAiSuggestion(null); setError(''); }} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white">+ Νέα καταχώρηση</button></div>
    </header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3" aria-label="Φίλτρα Portfolio">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Αναζήτηση τίτλου, περιγραφής ή υλικού" aria-label="Αναζήτηση έργου Portfolio" className="w-full rounded-lg border border-stone-200 p-2.5 text-sm" />
        <select aria-label="Κατηγορία Portfolio" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as CategoryId | 'all')} className="rounded-lg border border-stone-200 p-2.5 text-sm"><option value="all">Όλες οι κατηγορίες</option>{CATEGORIES.filter(cat => cat.id !== 'jewelry').map(cat => <option key={cat.id} value={cat.id}>{cat.title}</option>)}</select>
        <select aria-label="Κατάσταση Portfolio" value={visibilityFilter} onChange={event => { setVisibilityFilter(event.target.value as 'active' | 'archived'); setSelectedIds([]); }} className="rounded-lg border border-stone-200 p-2.5 text-sm"><option value="active">Ενεργά</option><option value="archived">Αρχείο</option></select>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden"><button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={view === 'grid' ? 'bg-stone-900 px-3 text-sm text-white' : 'px-3 text-sm'}>Πλέγμα</button><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={view === 'list' ? 'bg-stone-900 px-3 text-sm text-white' : 'px-3 text-sm'}>Λίστα</button></div>
      </div>
      {visibilityFilter === 'active' && <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600"><label><input type="checkbox" checked={items.length > 0 && items.every(item => selectedIds.includes(item.id))} onChange={event => setSelectedIds(event.target.checked ? items.map(item => item.id) : [])} /> Επιλογή όλων</label><span>{selectedItems.length} επιλεγμένα</span><button type="button" disabled={!selectedItems.length} onClick={bulkArchive} className="rounded border border-rose-200 px-2 py-1 text-rose-700 disabled:opacity-40">Αρχειοθέτηση επιλεγμένων</button></div>}
    </section>
    {loading ? <p>Φόρτωση Portfolio…</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">Δεν βρέθηκαν έργα με αυτά τα φίλτρα.</p> : <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>{items.map(item => <article key={item.id} className={view === 'grid' ? 'overflow-hidden rounded-xl border border-stone-200 bg-white' : 'flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white sm:flex-row'}>
      <div className={view === 'grid' ? 'aspect-[4/3] bg-stone-100' : 'h-44 bg-stone-100 sm:w-52 sm:shrink-0'}>{item.videoUrl && item.videoUrl === (item.imageUrl || item.image) ? <video src={item.videoUrl} className="h-full w-full object-cover" muted playsInline /> : <img src={item.imageUrl || item.image} alt="" className="h-full w-full object-cover" />}</div>
      <div className="flex-1 space-y-2 p-4"><div className="flex items-start gap-2">{visibilityFilter === 'active' && <input type="checkbox" aria-label={`Επιλογή ${item.title || item.name}`} checked={selectedIds.includes(item.id)} onChange={event => setSelectedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}<h2 className="font-bold">{item.title || item.name}</h2></div><p className="text-xs text-stone-500">{CATEGORIES.find(cat => cat.id === item.category)?.title || item.category} · {item.year} · {item.medium}</p><p className="line-clamp-2 text-xs text-stone-600">{item.description}</p><div className="flex flex-wrap gap-2 text-[11px]">{item.featured && <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Προτεινόμενο</span>}{item.mediaList?.some(media => media.type === 'video') && <span className="rounded bg-violet-50 px-2 py-1 text-violet-700">Βίντεο</span>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => edit(item)} className="rounded-lg border px-3 py-1.5 text-sm">Επεξεργασία</button>{visibilityFilter === 'active' ? <button type="button" onClick={() => remove(item)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700">Αρχειοθέτηση</button> : <button type="button" onClick={() => restore(item)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-700">Επαναφορά</button>}</div></div>
    </article>)}</div>}
    {form && <div role="dialog" aria-modal="true" aria-label={form.id ? 'Επεξεργασία έργου' : 'Νέο έργο'} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><form onSubmit={save} className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-bold">{form.id ? 'Επεξεργασία έργου' : 'Νέα καταχώρηση Portfolio'}</h2><p className="text-xs text-stone-500">Επεξεργασία και καταχώρηση όπως στον κατάλογο Shop</p></div><button type="button" onClick={() => setForm(null)} aria-label="Κλείσιμο" className="rounded-lg border px-3 py-1">✕</button></div>
      <div role="tablist" aria-label="Επεξεργασία έργου" className="flex gap-1 border-b px-5 pt-3">{([['basics', 'Βασικά'], ['details', 'Λεπτομέρειες'], ['media', 'Εικόνες / Βίντεο'], ['ai', 'AI']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={editorTab === key} onClick={() => setEditorTab(key)} className={editorTab === key ? 'border-b-2 border-stone-900 px-3 py-2 text-sm font-bold' : 'px-3 py-2 text-sm text-stone-500'}>{label}</button>)}</div>
      <div className="overflow-y-auto p-5 space-y-4">
        {editorTab === 'basics' && <><label className="block text-sm">Τίτλος<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Κατηγορία<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as CategoryId })} className="mt-1 block w-full rounded-lg border p-2.5">{CATEGORIES.filter(cat => cat.id !== 'jewelry').map(cat => <option key={cat.id} value={cat.id}>{cat.title}</option>)}</select></label><label className="text-sm">Κατάσταση<input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label><label className="text-sm">Έτος<input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label><label className="text-sm">Υλικό / Τεχνική<input value={form.medium} onChange={e => setForm({ ...form, medium: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label></div><label className="block text-sm">Περιγραφή<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 block min-h-32 w-full rounded-lg border p-2.5" /></label></>}
        {editorTab === 'details' && <><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Διαστάσεις<input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label><label className="text-sm">Προέλευση / Συλλογή<input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} className="mt-1 block w-full rounded-lg border p-2.5" /></label></div><label className="block text-sm">Πρόσθετες λεπτομέρειες, μία ανά γραμμή<textarea value={form.detailsText} onChange={e => setForm({ ...form, detailsText: e.target.value })} className="mt-1 block min-h-24 w-full rounded-lg border p-2.5" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />Προτεινόμενο έργο</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inquiryOnly} onChange={e => setForm({ ...form, inquiryOnly: e.target.checked })} />Μόνο κατόπιν επικοινωνίας</label></>}
        {editorTab === 'media' && <><label className="block text-sm">Φωτογραφίες ή βίντεο<input type="file" accept="image/*,video/*" multiple onChange={e => upload(e.target.files)} className="mt-1 block w-full rounded-lg border p-2.5" /></label>{uploading && <p role="status" className="text-sm text-stone-600">Ανέβασμα αρχείων…</p>}<div className="flex gap-2"><input type="url" value={newMediaUrl} onChange={e => setNewMediaUrl(e.target.value)} placeholder="https://... εικόνα ή βίντεο" className="min-w-0 flex-1 rounded-lg border p-2.5" /><button type="button" onClick={addMediaUrl} className="rounded-lg border px-3 text-sm">Προσθήκη URL</button></div><p className="text-xs text-stone-500">Το πρώτο αρχείο είναι το Hero. Μπορείς να αλλάξεις τη σειρά και να προσθέσεις λεζάντα σε κάθε media.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{form.mediaList.map((media, index) => <div key={`${media.url}-${index}`} className="overflow-hidden rounded-lg border p-2">{media.type === 'video' ? <video src={media.url} className="aspect-square w-full rounded object-cover" muted controls /> : <img src={media.url} alt="" className="aspect-square w-full rounded object-cover" />}<span className="block truncate py-1 text-[11px] text-stone-500">{index === 0 ? 'Hero · ' : ''}{media.type === 'video' ? 'Βίντεο' : 'Εικόνα'}</span><input aria-label={`Λεζάντα media ${index + 1}`} value={media.title || ''} onChange={e => setForm(current => current && ({ ...current, mediaList: current.mediaList.map((entry, i) => i === index ? { ...entry, title: e.target.value } : entry) }))} placeholder="Λεζάντα" className="w-full rounded border p-1.5 text-xs" /><div className="mt-2 flex flex-wrap gap-1 text-xs"><MediaDownload media={media} name={form.title || 'aram-portfolio'} /><button type="button" disabled={index === 0} onClick={() => setForm(current => { if (!current) return current; const next = [...current.mediaList]; const [chosen] = next.splice(index, 1); next.unshift(chosen); return { ...current, mediaList: next }; })} className="rounded bg-stone-100 px-1.5 py-1 disabled:opacity-40">Hero</button><button type="button" disabled={index === 0} onClick={() => setForm(current => { if (!current) return current; const next = [...current.mediaList]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return { ...current, mediaList: next }; })} className="rounded bg-stone-100 px-1.5 py-1 disabled:opacity-40">↑</button><button type="button" disabled={index === form.mediaList.length - 1} onClick={() => setForm(current => { if (!current) return current; const next = [...current.mediaList]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return { ...current, mediaList: next }; })} className="rounded bg-stone-100 px-1.5 py-1 disabled:opacity-40">↓</button><button type="button" onClick={() => setForm(current => current && ({ ...current, mediaList: current.mediaList.filter((_, i) => i !== index) }))} className="rounded bg-rose-50 px-1.5 py-1 text-rose-700">Αφαίρεση</button></div></div>)}</div></>}
        {editorTab === 'ai' && <section className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4"><h3 className="font-bold text-violet-900">AI Studio Portfolio</h3><p className="text-xs text-violet-700">Πρόταση τίτλου και περιγραφής βάσει των πεδίων του έργου. Έλεγξε την πρόταση πριν την εφαρμόσεις.</p><textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Προαιρετικές οδηγίες για το ύφος ή τα στοιχεία του έργου" className="min-h-24 w-full rounded-lg border border-violet-200 p-3 text-sm" /><div className="flex flex-wrap gap-2"><button type="button" disabled={aiWorking} onClick={() => generateAiSuggestion('full')} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{aiWorking ? 'Δημιουργία…' : 'Πλήρης πρόταση'}</button><button type="button" disabled={aiWorking} onClick={() => generateAiSuggestion('title')} className="rounded-lg border border-violet-300 px-3 py-2 text-sm">Τίτλος</button><button type="button" disabled={aiWorking} onClick={() => generateAiSuggestion('description')} className="rounded-lg border border-violet-300 px-3 py-2 text-sm">Περιγραφή</button></div>{aiSuggestion && <div className="space-y-2 rounded-lg bg-white p-3 text-sm"><p><strong>Τίτλος:</strong> {aiSuggestion.title}</p><p><strong>Περιγραφή:</strong> {aiSuggestion.description}</p><button type="button" onClick={() => { setForm(current => current && ({ ...current, title: aiSuggestion.title || current.title, description: aiSuggestion.description || current.description })); setEditorTab('basics'); }} className="rounded-lg bg-stone-900 px-3 py-2 font-bold text-white">Εφαρμογή στη φόρμα</button></div>}</section>}
        {error && <p role="alert" className="rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      </div>
      <div className="flex justify-between gap-2 border-t p-4"><span className="text-xs text-stone-500">{form.mediaList.length} media</span><div className="flex gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-lg border px-4 py-2">Άκυρο</button><button type="submit" disabled={saving || uploading} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Αποθήκευση…' : 'Αποθήκευση έργου'}</button></div></div>
    </form></div>}
  </main>;
};




