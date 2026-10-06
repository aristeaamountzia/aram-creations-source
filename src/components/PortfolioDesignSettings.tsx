import React, { useState } from 'react';
import { PortfolioDesign, normalizePortfolioDesign } from '../lib/portfolio-settings';
export function PortfolioDesignSettings({ value, onChange }: { value?: PortfolioDesign; onChange: (value: PortfolioDesign) => void }) {
  const design = normalizePortfolioDesign(value);
  const [dragging, setDragging] = useState<string | null>(null);
  const update = (part: Partial<PortfolioDesign>) => onChange({ ...design, ...part });
  const move = (id: string, target: string) => {
    const next = [...design.categories], from = next.findIndex(c => c.id === id), to = next.findIndex(c => c.id === target);
    if (from < 0 || to < 0 || from === to) return;
    next.splice(to, 0, next.splice(from, 1)[0]); update({categories:next});
  };
  const input = 'mt-1 block w-full rounded-lg border border-stone-200 p-2.5 text-sm';
  return <div className="space-y-6">
    <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Κείμενα αρχικής Portfolio</h3>
      <label className="block text-sm">Επικεφαλίδα<input className={input} value={design.title} onChange={e => update({title:e.target.value})} /></label>
      <label className="block text-sm">Περιγραφή<textarea className={input} value={design.subtitle} onChange={e => update({subtitle:e.target.value})} /></label>
      <label className="block text-sm">Κείμενο επικοινωνίας<input className={input} value={design.contactLabel} onChange={e => update({contactLabel:e.target.value})} /></label>
    </section>
    <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Κατηγορίες και σειρά εμφάνισης</h3><p className="text-xs text-stone-500">Σύρε τις κατηγορίες ή χρησιμοποίησε τα βέλη. Τα ίδια ονόματα εμφανίζονται στα φίλτρα και στην επεξεργασία έργων.</p>
      {design.categories.map((cat, index) => <div key={cat.id} draggable onDragStart={e => { if ((e.target as HTMLElement).closest('input,textarea,button')) { e.preventDefault(); return; } setDragging(cat.id); }} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); if (dragging) move(dragging,cat.id); setDragging(null);}} onDragEnd={() => setDragging(null)} className="rounded-lg border bg-white p-3">
        <div className="flex items-center gap-2"><span aria-hidden="true">⠿</span><label className="flex-1 text-xs">Όνομα κατηγορίας<input className={input} value={cat.title} onChange={e => update({categories:design.categories.map(c => c.id === cat.id ? {...c,title:e.target.value} : c)})} /></label>
          <button type="button" aria-label={`Πάνω ${cat.title}`} disabled={!index} onClick={() => move(cat.id,design.categories[index-1].id)} className="rounded border p-2 disabled:opacity-30">↑</button>
          <button type="button" aria-label={`Κάτω ${cat.title}`} disabled={index===design.categories.length-1} onClick={() => move(cat.id,design.categories[index+1].id)} className="rounded border p-2 disabled:opacity-30">↓</button></div>
        <label className="mt-2 block text-xs">Περιγραφή κατηγορίας<textarea className={input} value={cat.description} onChange={e => update({categories:design.categories.map(c => c.id === cat.id ? {...c,description:e.target.value} : c)})} /></label>
      </div>)}
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => update({categories:[...design.categories,{id:`portfolio-${crypto.randomUUID()}`,title:'Νέα κατηγορία',description:''}]})}>+ Κατηγορία</button>
    </section>
    <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Καταστάσεις έργων</h3><p className="text-xs text-stone-500">Η μετονομασία εφαρμόζεται και στα ήδη καταχωρημένα έργα.</p>
      {design.statuses.map(status => <label key={status.id} className="block text-xs">Κατάσταση<input className={input} value={status.label} onChange={e => update({statuses:design.statuses.map(s => s.id===status.id ? {...s,label:e.target.value} : s)})} /></label>)}
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => update({statuses:[...design.statuses,{id:`status-${crypto.randomUUID()}`,label:'Νέα κατάσταση'}]})}>+ Κατάσταση</button>
    </section>
    <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Υλικά και ονόματα πεδίων</h3><label className="block text-sm">Προτεινόμενα υλικά / τεχνικές, ένα ανά γραμμή<textarea className={input} value={design.materials.join('\n')} onChange={e => update({materials:e.target.value.split('\n')})} /></label>
      {Object.entries(design.labels).map(([key,label]) => <label key={key} className="block text-sm">{({category:'Κατηγορία',status:'Κατάσταση',medium:'Υλικό / Τεχνική',dimensions:'Διαστάσεις',year:'Έτος'} as Record<string,string>)[key]}<input className={input} value={label} onChange={e => update({labels:{...design.labels,[key]:e.target.value}})} /></label>)}
    </section>
  </div>;
}
