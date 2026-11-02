import React, { useState } from 'react';
import { PortfolioDesign, normalizePortfolioDesign } from '../lib/portfolio-settings';

export function PortfolioDesignSettings({
  value,
  onChange
}: {
  value?: PortfolioDesign;
  onChange: (value: PortfolioDesign) => void;
}) {
  const design = normalizePortfolioDesign(value);
  const [dragging, setDragging] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState('');

  const update = (part: Partial<PortfolioDesign>) => onChange({ ...design, ...part });

  const move = (id: string, target: string) => {
    const next = [...design.categories];
    const from = next.findIndex(c => c.id === id);
    const to = next.findIndex(c => c.id === target);
    if (from < 0 || to < 0 || from === to) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    update({ categories: next });
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newMaterial.trim();
    if (!val || design.materials.includes(val)) return;
    update({ materials: [...design.materials, val] });
    setNewMaterial('');
  };

  const handleRemoveMaterial = (mat: string) => {
    update({ materials: design.materials.filter(m => m !== mat) });
  };

  return (
    <div className="space-y-6">
      {/* Intro Box */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-700 shadow-xs">
        <strong className="text-sm font-black text-stone-900 block mb-1">
          Ρυθμίσεις & Δομή Portfolio
        </strong>
        Διαχειριστείτε τους τίτλους, τη σειρά των κατηγοριών, τις καταστάσεις διαθεσιμότητας και τα
        προτεινόμενα υλικά για όλα τα έργα τέχνης.
      </div>

      {/* Header Texts */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Κείμενα Αρχικής Σελίδας Portfolio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Κεντρική Επικεφαλίδα</label>
            <input
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-stone-400"
              value={design.title}
              onChange={e => update({ title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Κείμενο Κουμπιού Επικοινωνίας</label>
            <input
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-stone-400"
              value={design.contactLabel}
              onChange={e => update({ contactLabel: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Υπότιτλος & Περιγραφή</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-stone-400 resize-none"
            value={design.subtitle}
            onChange={e => update({ subtitle: e.target.value })}
          />
        </div>
      </section>

      {/* Categories Reordering & Management */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Κατηγορίες Έργων & Σειρά Εμφάνισης
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Σύρετε τις κάρτες ή χρησιμοποιήστε τα βέλη για να αλλάξετε τη σειρά στο μενού.
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-stone-800 transition"
            onClick={() =>
              update({
                categories: [
                  ...design.categories,
                  {
                    id: `portfolio-${crypto.randomUUID()}`,
                    title: 'Νέα κατηγορία',
                    description: ''
                  }
                ]
              })
            }
          >
            + Προσθήκη Κατηγορίας
          </button>
        </div>

        <div className="space-y-3">
          {design.categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={e => {
                if ((e.target as HTMLElement).closest('input,textarea,button')) {
                  e.preventDefault();
                  return;
                }
                setDragging(cat.id);
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragging) move(dragging, cat.id);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 hover:bg-white transition shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-stone-400 cursor-grab active:cursor-grabbing text-base" title="Σύρετε">
                  ⠿
                </span>
                <div className="flex-1">
                  <input
                    placeholder="Όνομα κατηγορίας"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 outline-none focus:border-stone-400"
                    value={cat.title}
                    onChange={e =>
                      update({
                        categories: design.categories.map(c =>
                          c.id === cat.id ? { ...c, title: e.target.value } : c
                        )
                      })
                    }
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Πάνω ${cat.title}`}
                    disabled={!index}
                    onClick={() => move(cat.id, design.categories[index - 1].id)}
                    className="h-8 w-8 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 disabled:opacity-30 hover:bg-stone-100 flex items-center justify-center text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Κάτω ${cat.title}`}
                    disabled={index === design.categories.length - 1}
                    onClick={() => move(cat.id, design.categories[index + 1].id)}
                    className="h-8 w-8 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 disabled:opacity-30 hover:bg-stone-100 flex items-center justify-center text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        categories: design.categories.filter(c => c.id !== cat.id)
                      })
                    }
                    className="h-8 px-2 rounded-lg border border-rose-200 bg-rose-50 font-bold text-rose-700 hover:bg-rose-100 text-xs"
                    title="Διαγραφή κατηγορίας"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-2 pl-7">
                <input
                  placeholder="Σύντομη περιγραφή (προαιρετικό)"
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] text-stone-600 outline-none focus:border-stone-400"
                  value={cat.description || ''}
                  onChange={e =>
                    update({
                      categories: design.categories.map(c =>
                        c.id === cat.id ? { ...c, description: e.target.value } : c
                      )
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Statuses Management */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-stone-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Καταστάσεις Διαθεσιμότητας Έργων
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Οι αλλαγές εμφανίζονται στα φίλτρα και στις κάρτες έργων.
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-stone-800 transition"
            onClick={() =>
              update({
                statuses: [
                  ...design.statuses,
                  { id: `status-${crypto.randomUUID()}`, label: 'Νέα κατάσταση' }
                ]
              })
            }
          >
            + Προσθήκη Κατάστασης
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {design.statuses.map(status => (
            <div
              key={status.id}
              className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-2.5"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <input
                className="flex-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800 outline-none"
                value={status.label}
                onChange={e =>
                  update({
                    statuses: design.statuses.map(s =>
                      s.id === status.id ? { ...s, label: e.target.value } : s
                    )
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  update({
                    statuses: design.statuses.filter(s => s.id !== status.id)
                  })
                }
                className="text-stone-400 hover:text-rose-600 p-1"
                title="Διαγραφή κατάστασης"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Suggested Materials & Tags */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Προτεινόμενα Υλικά & Τεχνικές
        </h3>
        <p className="text-xs text-stone-500">
          Προτείνονται αυτόματα κατά την καταχώρηση νέων έργων για γρήγορη επιλογή.
        </p>

        {/* Tag pills */}
        <div className="flex flex-wrap gap-2">
          {design.materials.filter(Boolean).map(mat => (
            <span
              key={mat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-bold text-stone-800 shadow-2xs"
            >
              {mat}
              <button
                type="button"
                onClick={() => handleRemoveMaterial(mat)}
                className="text-stone-400 hover:text-rose-600 font-bold"
                title="Αφαίρεση"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {/* Add tag form */}
        <form onSubmit={handleAddMaterial} className="flex gap-2 max-w-sm pt-2">
          <input
            type="text"
            placeholder="Προσθήκη νέου υλικού..."
            value={newMaterial}
            onChange={e => setNewMaterial(e.target.value)}
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:bg-white"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition"
          >
            + Προσθήκη
          </button>
        </form>
      </section>

      {/* Field Labels */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Ετικέτες Πεδίων Portfolio
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(design.labels).map(([key, label]) => {
            const greekName =
              ({
                category: 'Κατηγορία',
                status: 'Κατάσταση',
                medium: 'Υλικό / Τεχνική',
                dimensions: 'Διαστάσεις',
                year: 'Έτος'
              } as Record<string, string>)[key] || key;
            return (
              <div key={key} className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                  {greekName}
                </label>
                <input
                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 outline-none"
                  value={label}
                  onChange={e =>
                    update({
                      labels: { ...design.labels, [key]: e.target.value }
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
