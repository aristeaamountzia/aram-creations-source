import { useTouchReorder } from '../../lib/use-touch-reorder';
import { SlidersHorizontal } from 'lucide-react';
import { portfolioStatusLabel } from '../../lib/portfolio-settings';
import { portfolioMedia } from '../../lib/video-links';
import { VideoPlayer } from '../VideoPlayer';
import { CatalogControls } from '../CatalogControls';
import { CategoryId } from '../../types';
import type { SortOption } from './portfolio-model';
import { IconGrid, IconList, IconClone, IconEdit, IconEye, IconTrash, IconUndo } from './icons';
import type { PortfolioHistory } from './usePortfolioHistory';
import type { PortfolioCatalog } from './usePortfolioCatalog';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioActions } from './createPortfolioActions';
import type { PortfolioSelection } from './usePortfolioSelection';

type Props = Pick<PortfolioHistory, 'changes' | 'showHistory'> &
  Pick<
  PortfolioCatalog,
  'error' | 'metrics' | 'setStatsFilter' | 'statsFilter' | 'categoryFilter' | 'design' | 'query' |
  'setCategoryFilter' | 'setQuery' | 'setSortBy' | 'setView' | 'sortBy' | 'view' | 'items' | 'loading'
> &
  Pick<
  PortfolioWorkspace,
  'form' | 'orderMessage' | 'setOrderMessage' | 'setIsBulkEditOpen' | 'draggedId' | 'reordering' |
  'setDraggedId' | 'setImageEditorTarget' | 'setInspectItem'
> &
  Pick<
  PortfolioActions,
  'bulkArchive' | 'bulkRestore' | 'cloneItem' | 'edit' | 'getStatusColor' | 'remove' | 'reorder' | 'restore'
> &
  Pick<
  PortfolioSelection,
  'selectedIds' | 'selectedItems' | 'setSelectedIds' | 'finishLassoSelection' | 'handleArtworkSelectionClick' |
  'handleLassoMove' | 'handleLassoStart' | 'lassoRect' | 'portfolioGridRef' | 'selectItem'
>;

export function PortfolioCatalogPanel(props: Props) {
  const {
    changes, showHistory, error, form, orderMessage, setOrderMessage, metrics, setStatsFilter, statsFilter,
    categoryFilter, design, query, setCategoryFilter, setQuery, setSortBy, setView, sortBy, view, bulkArchive,
    bulkRestore, items, selectedIds, selectedItems, setIsBulkEditOpen, setSelectedIds, cloneItem, draggedId,
    edit, finishLassoSelection, getStatusColor, handleArtworkSelectionClick, handleLassoMove, handleLassoStart,
    lassoRect, loading, portfolioGridRef, remove, reorder, reordering, restore, selectItem, setDraggedId,
    setImageEditorTarget, setInspectItem
  } = props;
  const touchReorder = useTouchReorder((from, to) => { void reorder(from, to); }, reordering || statsFilter !== 'active');
  return (
    <>{showHistory && <section aria-label="Ιστορικό Portfolio" className="p-4 mb-4 border rounded-xl max-h-64 overflow-auto">
            <h2 className="font-bold">Ιστορικό Portfolio</h2>
            {changes.length ? changes.map(entry => <p key={entry.cloudId} className="text-sm py-1">{new Date(entry.timestamp).toLocaleString('el-GR')} · {entry.message} · {entry.name}</p>) : <p>Δεν υπάρχουν καταγεγραμμένες αλλαγές.</p>}
          </section>}
    {error && !form && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 mb-6">
              {error}
            </div>
          )}
    {orderMessage && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 mb-6 flex justify-between items-center animate-fade-in">
              <span>{orderMessage}</span>
              <button onClick={() => setOrderMessage('')} className="text-emerald-900 text-xs underline">
                Κλείσιμο
              </button>
            </div>
          )}
    <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-end mb-3 px-1 min-w-0">
              <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">
                Στατιστικα Καταλογου Portfolio
              </h3>
              <div className="backoffice-stats-filter flex flex-wrap bg-stone-200/70 rounded-lg p-1 max-w-full">
                <button
                  onClick={() => setStatsFilter('active')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${
                    statsFilter === 'active'
                      ? 'bg-white text-stone-800'
                      : 'text-stone-500 hover:text-stone-700 shadow-none'
                  }`}
                >
                  Ενεργά ({metrics.active})
                </button>
                <button
                  onClick={() => setStatsFilter('archived')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${
                    statsFilter === 'archived'
                      ? 'bg-white text-stone-800'
                      : 'text-stone-500 hover:text-stone-700 shadow-none'
                  }`}
                >
                  Αρχείο ({metrics.archived})
                </button>
                <button
                  onClick={() => setStatsFilter('featured')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${
                    statsFilter === 'featured'
                      ? 'bg-white text-stone-800'
                      : 'text-stone-500 hover:text-stone-700 shadow-none'
                  }`}
                >
                  Προτεινόμενα ({metrics.featured})
                </button>
                <button
                  onClick={() => setStatsFilter('all')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-md transition shadow-sm ${
                    statsFilter === 'all'
                      ? 'bg-white text-stone-800'
                      : 'text-stone-500 hover:text-stone-700 shadow-none'
                  }`}
                >
                  Συνολικά ({metrics.total})
                </button>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="backoffice-stats-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Συνολο Εργων
                </span>
                <span className="text-xl sm:text-2xl font-black text-stone-950">{metrics.total}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Ενεργα στο Portfolio
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">{metrics.active}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Προτεινομενα Εργα
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-700">{metrics.featured}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center transition">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Συνολο Media (Εικονες/Βιντεο)
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-700">{metrics.mediaTotal}</span>
              </div>
            </div>
          </div>
    <div className="mb-6">
            <CatalogControls
              label="Φίλτρα Back Office Portfolio"
              search={query}
              onSearch={setQuery}
              placeholder="Αναζήτηση (τίτλος, κατηγορία, υλικό, διαστάσεις)..."
              categories={[
                { id: 'all', label: 'Όλες οι Κατηγορίες' },
                ...design.categories.map(category => ({
                  id: category.id,
                  label: category.title
                }))
              ]}
              selectedCategory={categoryFilter}
              onCategory={id => setCategoryFilter(id as CategoryId | 'all')}
              actions={
                <>
                  <select
                    aria-label="Ταξινόμηση"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:border-stone-400 text-sm"
                  >
                    <option value="portfolio_order">Σειρά Portfolio</option>
                    <option value="year_desc">Έτος (Νεότερα)</option>
                    <option value="year_asc">Έτος (Παλαιότερα)</option>
                    <option value="title_asc">Τίτλος (Α-Ω)</option>
                    <option value="title_desc">Τίτλος (Ω-Α)</option>
                  </select>

                  <div className="flex border border-stone-200 rounded-lg overflow-hidden md:ml-auto">
                    <button
                      type="button"
                      aria-pressed={view === 'grid'}
                      onClick={() => setView('grid')}
                      className={`p-2 transition ${
                        view === 'grid'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-white text-stone-400 hover:text-stone-600'
                      }`}
                      title="Προβολή Πλέγματος"
                    >
                      <IconGrid />
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'list'}
                      onClick={() => setView('list')}
                      className={`p-2 transition ${
                        view === 'list'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-white text-stone-400 hover:text-stone-600'
                      }`}
                      title="Προβολή Λίστας"
                    >
                      <IconList />
                    </button>
                  </div>
                </>
              }
            />
          </div>
    <div className="mb-6 bg-white border border-stone-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                  checked={items.length > 0 && items.every(item => selectedIds.includes(item.id))}
                  onChange={e =>
                    setSelectedIds(e.target.checked ? items.map(item => item.id) : [])
                  }
                />
                Επιλογή Όλων ({items.length})
              </label>
              <span className="text-xs text-stone-500 font-bold">
                {selectedItems.length} επιλεγμένα
              </span>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkEditOpen(true)}
                  className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition shadow-xs"
                >
                  Μαζική Επεξεργασία
                </button>
                {statsFilter === 'archived' ? (
                  <button
                    type="button"
                    onClick={bulkRestore}
                    className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition shadow-xs"
                  >
                    Επαναφορά Επιλεγμένων
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={bulkArchive}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold hover:bg-rose-100 transition shadow-xs"
                  >
                    Αρχειοθέτηση Επιλεγμένων
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-200 transition"
                >
                  Αποεπιλογή
                </button>
              </div>
            )}
          </div>
    {loading ? (
            <div className="p-12 text-center text-sm font-bold text-stone-500 bg-white rounded-2xl border border-stone-200">
              Φόρτωση καταλόγου Portfolio…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500">
              Δεν βρέθηκαν έργα με αυτά τα κριτήρια αναζήτησης.
            </div>
          ) : view === 'grid' ? (
            <div
              ref={portfolioGridRef}
              onPointerDown={handleLassoStart}
              onPointerMove={handleLassoMove}
              onPointerUp={finishLassoSelection}
              onPointerCancel={finishLassoSelection}
              className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 select-none p-2 rounded-2xl"
            >
              {lassoRect && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-20 border-2 border-emerald-600 bg-emerald-300/20"
                  style={lassoRect}
                />
              )}
              {items.map(item => {
                const media = portfolioMedia(item);
                const first = media[0];
                const isArchived = Boolean(item.isDeleted || item.deletedAt);
                const isSelected = selectedIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    data-product-id={item.id}
                    onClick={e => handleArtworkSelectionClick(e, item.id)}
                    {...touchReorder(item.id)}
                    draggable={statsFilter === 'active' && !reordering}
                    onDragStart={e => {
                      if ((e.target as HTMLElement).closest('button,input,select,a')) {
                        e.preventDefault();
                        return;
                      }
                      setDraggedId(item.id);
                      e.dataTransfer.setData('text/plain', item.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={e => {
                      if (draggedId && draggedId !== item.id && !reordering) e.preventDefault();
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      if (draggedId) void reorder(draggedId, item.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                    className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition relative cursor-grab active:cursor-grabbing ${
                      isSelected ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'
                    } ${isArchived ? 'opacity-75' : ''}`}
                  >
                    <button type="button" data-reorder-handle disabled={reordering || statsFilter !== 'active'} style={{ touchAction: 'none' }} onClick={event => event.stopPropagation()} className="min-h-11 px-3 text-xs font-bold cursor-grab bg-stone-100">⠿ Σύρε για αλλαγή σειράς</button>
                    {/* Image / Video Media Thumbnail */}
                    <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                      {/* Select Checkbox */}
                      <label
                        onClick={e => e.stopPropagation()}
                        className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg p-1 shadow-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          aria-label={`Επιλογή ${item.title || item.name}`}
                          className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer"
                          checked={isSelected}
                          onClick={e => {
                            e.stopPropagation();
                            selectItem(item.id, e.shiftKey);
                          }}
                          onChange={() => {}}
                        />
                      </label>

                      {/* Media Content */}
                      {first ? (
                        first.type === 'video' ? (
                          <VideoPlayer url={first.url} title={item.title} />
                        ) : (
                          <img
                            src={first.url || item.imageUrl || item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className={`w-full h-full object-cover ${isArchived ? 'grayscale' : ''}`}
                          />
                        )
                      ) : (
                        <span className="text-xs text-stone-400">Χωρίς εικόνα</span>
                      )}

                      {/* Media count pill */}
                      {media.length > 1 && (
                        <div className="absolute top-2 right-2 bg-stone-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {media.length} αρχεία
                        </div>
                      )}

                      {/* Reorder up / down arrows */}
                      {statsFilter === 'active' && (
                        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              const idx = items.indexOf(item);
                              if (idx > 0) reorder(item.id, items[idx - 1].id);
                            }}
                            disabled={reordering || items.indexOf(item) === 0}
                            className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow hover:bg-white"
                            title="Πιο πάνω στο Portfolio"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              const idx = items.indexOf(item);
                              if (idx < items.length - 1) reorder(item.id, items[idx + 1].id);
                            }}
                            disabled={reordering || items.indexOf(item) === items.length - 1}
                            className="bg-white/90 disabled:opacity-40 text-stone-700 text-xs font-black px-2 py-1 rounded shadow hover:bg-white"
                            title="Πιο κάτω στο Portfolio"
                          >
                            ↓
                          </button>
                        </div>
                      )}

                      {/* Drag Handle Label */}
                      <div className="absolute bottom-2 left-2 bg-white/90 text-stone-600 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-stone-200">
                        Σύρε
                      </div>

                      {/* Featured Pill */}
                      {item.featured && (
                        <div className="absolute top-10 left-2 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          ⭐ Προτεινόμενο
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {design.categories.find(c => c.id === item.category)?.title ||
                              item.category}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${getStatusColor(
                              item.status || 'Διαθέσιμο'
                            )}`}
                          >
                            {portfolioStatusLabel(design, item.status)}
                          </span>
                        </div>

                        <h3 className="font-bold text-base leading-tight text-stone-900 mb-1">
                          {item.title || item.name}
                        </h3>
                        <p className="text-xs text-stone-500 mb-2">
                          {item.year && <span>{item.year} · </span>}
                          {item.origin && !item.origin.includes('Wix') && <span>{item.origin} · </span>}
                          {item.medium || 'Χειροποίητο'}
                        </p>

                        {item.dimensions && (
                          <p className="text-[11px] text-stone-400 font-mono mb-2">
                            {item.dimensions}
                          </p>
                        )}

                        {item.description && (
                          <p className="line-clamp-2 text-xs text-stone-600 mb-3 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Action Icons Bar */}
                      <div className="flex justify-between items-center pt-3 border-t border-stone-100 mt-2">
                        <span className="text-[11px] font-mono font-bold text-stone-500">
                          {item.inquiryOnly ? 'Κατόπιν Επικοινωνίας' : 'Έκθεση'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => cloneItem(item)}
                            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition"
                            title="Αντιγραφή Έργου"
                          >
                            <IconClone />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectItem(item)}
                            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition"
                            title="Προβολή Λεπτομερειών"
                          >
                            <IconEye />
                          </button>
                          {first && first.type !== 'video' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (/\.gif($|\?)/i.test(first.url)) {
                                  setOrderMessage('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται.');
                                  return;
                                }
                                setImageEditorTarget({
                                  url: first.url, originalUrl: first.originalUrl, itemId: item.id, mediaIndex: 0,
                                  title: item.title || item.name
                                });
                              }}
                              className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition"
                              title="Επεξεργασία Φωτογραφίας (Studio)"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => edit(item)}
                            className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded transition"
                            title="Επεξεργασία Στοιχείων Έργου"
                          >
                            <IconEdit />
                          </button>
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => restore(item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Επαναφορά"
                            >
                              <IconUndo />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => remove(item)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition"
                              title="Αρχειοθέτηση"
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="flex flex-col gap-3">
              {items.map(item => {
                const media = portfolioMedia(item);
                const first = media[0];
                const isArchived = Boolean(item.isDeleted || item.deletedAt);
                const isSelected = selectedIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    className={`flex flex-col sm:flex-row items-center gap-4 bg-white border rounded-xl p-4 shadow-xs hover:shadow-md transition ${
                      isSelected ? 'border-stone-900 ring-2 ring-stone-900/10' : 'border-stone-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Επιλογή ${item.title || item.name}`}
                      className="w-4 h-4 rounded border-stone-300 accent-stone-900 cursor-pointer"
                      checked={isSelected}
                      onClick={e => {
                        e.stopPropagation();
                        selectItem(item.id, e.shiftKey);
                      }}
                      onChange={() => {}}
                    />
                    <div className="h-24 w-24 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                      {first ? (
                        first.type === 'video' ? (
                          <video src={first.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" muted />
                        ) : (
                          <img
                            src={first.url || item.imageUrl || item.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">
                          {design.categories.find(c => c.id === item.category)?.title ||
                            item.category}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${getStatusColor(
                            item.status || 'Διαθέσιμο'
                          )}`}
                        >
                          {portfolioStatusLabel(design, item.status)}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-stone-900 truncate">
                        {item.title || item.name}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {item.year && <span>{item.year} · </span>}
                        {item.medium} {item.dimensions && `· ${item.dimensions}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => cloneItem(item)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded"
                        title="Αντιγραφή"
                      >
                        <IconClone />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectItem(item)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded"
                        title="Προβολή"
                      >
                        <IconEye />
                      </button>
                      <button
                        type="button"
                        onClick={() => edit(item)}
                        className="p-2 text-stone-500 hover:bg-stone-100 rounded"
                        title="Επεξεργασία"
                      >
                        <IconEdit />
                      </button>
                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => restore(item)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Επαναφορά"
                        >
                          <IconUndo />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                          title="Αρχειοθέτηση"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}</>
  );
}
