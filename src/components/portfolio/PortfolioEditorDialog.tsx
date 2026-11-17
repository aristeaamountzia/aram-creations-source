import { X } from 'lucide-react';
import { MediaManager } from '../media/MediaManager';
import { VideoUploadStatus } from '../VideoUploadStatus';
import { VIDEO_UPLOAD_HELP } from '../../lib/video-policy';
import { replacePortfolioImage } from '../../lib/portfolio-record';
import { CategoryId } from '../../types';

import type { PortfolioMediaActions } from './createPortfolioMediaActions';
import type { PortfolioAi } from './usePortfolioAi';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioCatalog } from './usePortfolioCatalog';
import type { PortfolioActions } from './createPortfolioActions';

type Props = Pick<PortfolioMediaActions, 'addMediaUrl' | 'upload'> &
  Pick<PortfolioAi, 'aiPrompt' | 'aiSuggestion' | 'aiWorking' | 'generateAiSuggestion' | 'setAiPrompt'> &
  Pick<
  PortfolioWorkspace,
  'closeEditor' | 'dispatchDraft' | 'draft' | 'editorTab' | 'form' | 'newMediaUrl' | 'saving' | 'setEditorTab' |
  'setForm' | 'setImageEditorTarget' | 'setNewMediaUrl' | 'setOrderMessage' | 'uploading' | 'videoAbort' |
  'videoCompressing' | 'videoProgress'
> &
  Pick<PortfolioCatalog, 'design' | 'error'> &
  Pick<PortfolioActions, 'save'>;

export function PortfolioEditorDialog(props: Props) {
  const {
    addMediaUrl, aiPrompt, aiSuggestion, aiWorking, closeEditor, design, dispatchDraft, draft, editorTab,
    error, form, generateAiSuggestion, newMediaUrl, save, saving, setAiPrompt, setEditorTab, setForm,
    setImageEditorTarget, setNewMediaUrl, setOrderMessage, upload, uploading, videoAbort, videoCompressing,
    videoProgress
  } = props;
  if (!form) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={form.id ? 'Επεξεργασία έργου' : 'Νέο έργο'}
      onClick={e => {
        if (e.target === e.currentTarget && !saving && !uploading) void closeEditor();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center cursor-pointer"
    >
      <form
        onSubmit={save}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl my-6 flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 animate-fade-in cursor-default"
      >
        <div className="relative flex items-start border-b border-stone-200 bg-stone-50 p-5 pr-20 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Artwork Thumbnail Preview */}
            {(() => {
              const preview = form.mediaList?.[0]?.url;
              if (!preview) return (
                <div className="w-12 h-12 rounded-xl bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">

                </div>
              );
              return (
                <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-300 overflow-hidden shrink-0 relative shadow-sm">
                  <img src={preview} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              );
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-stone-900 truncate">
                  {form.id ? (form.title || 'Επεξεργασία Έργου') : 'Νέα Καταχώρηση Portfolio'}
                </h2>
                {form.status && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 uppercase shrink-0">
                    {form.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                {form.category} {form.year ? `· ${form.year}` : ''} · Ενοποιημένη διαχείριση Portfolio
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => void closeEditor()}
            aria-label="Κλείσιμο"
            className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition"
          ><X className="w-4 h-4" /></button>
        </div>

        {/* Form Tabs */}
        <div
          role="tablist"
          aria-label="Επεξεργασία έργου"
          className="flex gap-1 border-b border-stone-200 px-5 pt-3 bg-stone-50/50"
        >
          {(
            [
              ['basics', 'Βασικά Στοιχεία'],
              ['details', 'Λεπτομέρειες'],
              ['media', 'Εικόνες & Βίντεο'],
              ['ai', 'AI Studio']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={editorTab === key}
              onClick={() => setEditorTab(key)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                editorTab === key
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</div>}
          <VideoUploadStatus
            value={videoProgress}
            busy={videoCompressing}
            onCancel={() => videoAbort.current?.abort()}
          />

          {/* Tab 1: Basics */}
          {editorTab === 'basics' && (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Τίτλος Έργου *
                </label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 p-3 text-sm bg-stone-50 focus:bg-white outline-none focus:border-stone-400"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {design.labels.category}
                  </label>
                  <select
                    value={form.category}
                    onChange={e =>
                      setForm({ ...form, category: e.target.value as CategoryId })
                    }
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  >
                    {design.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {design.labels.status}
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  >
                    {design.statuses.map(s => (
                      <option key={s.id} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {design.labels.year}
                  </label>
                  <input
                    value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}
                    placeholder="π.χ. 2024"
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {design.labels.medium}
                  </label>
                  <input
                    list="portfolio-material-options"
                    value={form.medium}
                    onChange={e => setForm({ ...form, medium: e.target.value })}
                    placeholder="π.χ. Υγρό γυαλί, ασήμι 925"
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  />
                  <datalist id="portfolio-material-options">
                    {design.materials.filter(Boolean).map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Περιγραφή Έργου
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Περιγράψτε το έργο, την έμπνευση και τα υλικά..."
                  className="w-full rounded-xl border border-stone-200 p-3 text-xs bg-stone-50 focus:bg-white outline-none resize-none"
                />
              </div>
            </>
          )}

          {/* Tab 2: Details */}
          {editorTab === 'details' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {design.labels.dimensions}
                  </label>
                  <input
                    value={form.dimensions}
                    onChange={e => setForm({ ...form, dimensions: e.target.value })}
                    placeholder="π.χ. 45 x 30 cm"
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Προέλευση / Συλλογή
                  </label>
                  <input
                    value={form.origin}
                    onChange={e => setForm({ ...form, origin: e.target.value })}
                    placeholder="π.χ. Συλλογή Μυθολογία"
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Πρόσθετες λεπτομέρειες, μία ανά γραμμή
                </label>
                <textarea
                  rows={3}
                  value={form.detailsText}
                  onChange={e => setForm({ ...form, detailsText: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 focus:bg-white outline-none resize-none"
                />
              </div>
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                  />
                  ⭐ Προτεινόμενο έργο (εμφανίζεται σε περίοπτη θέση)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.inquiryOnly}
                    onChange={e => setForm({ ...form, inquiryOnly: e.target.checked })}
                    className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                  />
                  Μόνο κατόπιν επικοινωνίας (κουμπί Εκδήλωσης Ενδιαφέροντος)
                </label>
              </div>
            </>
          )}

          {/* Tab 3: Media */}
          {editorTab === 'media' && (
            <MediaManager
              items={form.mediaList}
              variant="portfolio"
              uploadLabel="Ανέβασμα Φωτογραφιών ή Βίντεο"
              uploadHelp={VIDEO_UPLOAD_HELP}
              inputClassName="w-full rounded-xl border border-stone-200 p-3 text-xs bg-stone-50 focus:bg-white"
              disabled={uploading}
              downloadName={form.title || 'aram-portfolio-media'}
              orderingHelp="Σύρετε τα media για αλλαγή σειράς ή χρησιμοποιήστε τα πλήκτρα ↑/↓. Το πρώτο media είναι το κεντρικό."
              onFiles={upload}
              onChange={mediaList => setForm(current => current && { ...current, mediaList })}
              canRestore={media => Boolean(media.originalUrl && media.originalUrl !== media.url)}
              onRestore={index => setForm(current => {
                const media = current?.mediaList[index];
                if (!current || !media?.originalUrl) return current;
                return { ...current, mediaList: replacePortfolioImage(current.mediaList, index, media.url, media.originalUrl) };
              })}
              canEdit={media => media.type !== 'video'}
              onEdit={index => {
                const media = form.mediaList[index];
                if (/\.gif($|\?)/i.test(media.url)) {
                  setOrderMessage('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται.');
                  return;
                }
                setImageEditorTarget({ url: media.url, originalUrl: media.originalUrl, mediaIndex: index, title: form.title });
              }}
              onRemove={index => {
                // Pending objects are reconciled with the entire gallery on Save or Cancel.
                setForm(current => current && {
                  ...current,
                  mediaList: current.mediaList.filter((_, mediaIndex) => mediaIndex !== index)
                });
              }}
              onCaptionChange={(index, title) => setForm(current => current && {
                ...current,
                mediaList: current.mediaList.map((media, mediaIndex) =>
                  mediaIndex === index ? { ...media, title } : media
                )
              })}
            >
            <div className="flex gap-3">
              <button type="button" disabled={uploading || !draft.past.length} onClick={() => dispatchDraft('undo')} className="text-xs disabled:opacity-40">Αναίρεση αλλαγής media</button>
              <button type="button" disabled={uploading || !draft.future.length} onClick={() => dispatchDraft('redo')} className="text-xs disabled:opacity-40">Επανάληψη αλλαγής media</button>
            </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newMediaUrl}
                  onChange={e => setNewMediaUrl(e.target.value)}
                  placeholder="https://... εξωτερικό URL εικόνας ή βίντεο"
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 outline-none focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => void addMediaUrl()}
                  className="px-4 py-2 border border-stone-200 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 transition"
                >
                  + Προσθήκη URL
                </button>
              </div>

            </MediaManager>
          )}

          {/* Tab 4: AI */}
          {editorTab === 'ai' && (
            <section className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/50 p-5">
              <h3 className="font-bold text-violet-900 text-sm">AI Studio Portfolio</h3>
              <p className="text-xs text-violet-700 leading-relaxed">
                Δημιουργήστε αυτόματα καλλιτεχνικό τίτλο και περιγραφή με τεχνητή νοημοσύνη βάσει
                των στοιχείων του έργου.
              </p>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Προαιρετικές οδηγίες: π.χ. πιο ποιητικό ύφος, αναφορά στην αρχαία ελληνική τέχνη..."
                className="w-full rounded-xl border border-violet-200 bg-white p-3 text-xs outline-none resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={() => generateAiSuggestion('full')}
                  className="px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition"
                >
                  {aiWorking ? 'Δημιουργία…' : 'Πλήρης Πρόταση'}
                </button>
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={() => generateAiSuggestion('title')}
                  className="px-4 py-2 bg-white border border-violet-200 text-violet-800 rounded-xl text-xs font-bold hover:bg-violet-50 transition"
                >
                  Μόνο Τίτλος
                </button>
                <button
                  type="button"
                  disabled={aiWorking}
                  onClick={() => generateAiSuggestion('description')}
                  className="px-4 py-2 bg-white border border-violet-200 text-violet-800 rounded-xl text-xs font-bold hover:bg-violet-50 transition"
                >
                  Μόνο Περιγραφή
                </button>
              </div>
              {aiSuggestion && (
                <div className="space-y-2 rounded-xl bg-white border border-violet-200 p-4 text-xs shadow-xs">
                  {aiSuggestion.title && (
                    <div>
                      <strong className="text-stone-500">Πρόταση Τίτλου:</strong>{' '}
                      <span className="text-stone-900 font-bold">{aiSuggestion.title}</span>
                    </div>
                  )}
                  {aiSuggestion.description && (
                    <div>
                      <strong className="text-stone-500">Πρόταση Περιγραφής:</strong>
                      <p className="mt-1 text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        {aiSuggestion.description}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForm(
                        current =>
                          current && {
                            ...current,
                            title: aiSuggestion.title || current.title,
                            description: aiSuggestion.description || current.description
                          }
                      );
                      setEditorTab('basics');
                    }}
                    className="mt-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold"
                  >
                    Εφαρμογή στη Φόρμα
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center border-t border-stone-200 bg-stone-50 p-4">
          <span className="text-xs text-stone-500 font-bold">
            {form.mediaList.length} media αρχεία
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading || saving}
              onClick={() => void closeEditor()}
              className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-white transition"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση Έργου'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
