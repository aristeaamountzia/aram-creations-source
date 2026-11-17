import React from 'react';
import { notifyOperationSuccess, notifyOperationError } from '../../lib/sound-notifications';
import { portfolioMedia } from '../../lib/video-links';
import { buildCsv, downloadCsv } from '../../lib/csv-export';
import { Timestamp, collection, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { ART_ITEMS } from '../../data';
import { equalHistoryValue, stageHistory } from '../../lib/catalog-history';
import { movePortfolio } from '../../lib/portfolio-order';
import { buildPortfolioRecord } from '../../lib/portfolio-record';
import type { PortfolioRecord } from './portfolio-model';
import type { PortfolioCatalog } from './usePortfolioCatalog';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioAi } from './usePortfolioAi';
import type { PortfolioSelection } from './usePortfolioSelection';

type Dependencies = Pick<PortfolioCatalog, 'allItems' | 'setError' | 'statsFilter' | 'items'> &
  Pick<
  PortfolioWorkspace,
  'reordering' | 'setDraggedId' | 'setOrderMessage' | 'setReordering' | 'formBaseline' | 'setEditorTab' |
  'setForm' | 'setVideoProgress' | 'discardPendingUpload' | 'form' | 'pendingUploads' | 'saving' | 'setSaving' |
  'uploading'
> &
  Pick<PortfolioAi, 'setAiSuggestion'> &
  Pick<PortfolioSelection, 'selectedItems' | 'setSelectedIds'>;

export function createPortfolioActions(dependencies: Dependencies) {
  const {
    allItems, reordering, setDraggedId, setError, setOrderMessage, setReordering, statsFilter, formBaseline,
    setAiSuggestion, setEditorTab, setForm, setVideoProgress, discardPendingUpload, form, pendingUploads,
    saving, setSaving, uploading, selectedItems, setSelectedIds, items
  } = dependencies;

  const reorder = async (movingId: string, targetId: string) => {
    if (reordering || statsFilter !== 'active') return;
    const active = allItems.filter(item => !item.isDeleted && !item.deletedAt);
    const ordered = movePortfolio(active, movingId, targetId);
    if (ordered === active) return;
    setReordering(true);
    setError('');
    setOrderMessage('Αποθήκευση σειράς…');
    try {
      await savePatches(ordered.map((item, index) => ({ id: item.id, fields: { portfolioOrder: index } })),
        'PORTFOLIO_ORDER', 'Αλλαγή σειράς Portfolio');
      setOrderMessage('Η σειρά αποθηκεύτηκε και εφαρμόστηκε στο Portfolio.');
    } catch (err: any) {
      setError(`Δεν άλλαξε η σειρά: ${err.message}`);
      setOrderMessage('');
    } finally {
      setReordering(false);
      setDraggedId(null);
    }
  };

  async function savePatches(changes: Array<{ id: string; fields: Record<string, any> }>, type: string, message: string, name = '') {
    if (!changes.length) return;
    await runTransaction(db, async tx => {
      const snapshots = await Promise.all(changes.map(change => tx.get(doc(db, 'portfolio', change.id))));
      const before = [], after = [];
      for (const [index, snapshot] of snapshots.entries()) {
        const { id, fields } = changes[index];
        const previous = snapshot.data();
        const prior: Record<string, any> = { id };
        for (const key of Object.keys(fields)) if (previous && key in previous) prior[key] = previous[key];
        if (previous) before.push(prior);
        after.push({ id, ...fields });
        tx.set(snapshot.ref, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
      }
      const single = changes.length === 1;
      stageHistory(db, tx, { type, collection: 'portfolio', id: single ? changes[0].id : '', name, message,
        timestamp: new Date().toISOString(), before: single ? before[0] || null : before, after: single ? after[0] : after });
    });
  }

  const edit = (item: PortfolioRecord) => {
    formBaseline.current = item;
    const mediaList = portfolioMedia(item);
    setForm({
      id: item.id,
      title: item.title || item.name || '',
      category: item.category,
      year: item.year || '',
      medium: item.medium || '',
      dimensions: item.dimensions || '',
      origin: item.origin || '',
      status: item.status || 'Διαθέσιμο',
      description: item.description || '',
      detailsText: (item.details || []).join('\n'),
      featured: Boolean(item.featured),
      inquiryOnly: item.inquiryOnly !== false,
      mediaList
    });
    setEditorTab('basics');
    setVideoProgress(null);
    setAiSuggestion(null);
    setError('');
  };

  const cloneItem = async (item: PortfolioRecord) => {
    try {
      const mediaList = portfolioMedia(item);
      const newTitle = `${item.title || item.name} (Αντίγραφο)`;
      const first = mediaList[0];
      const record = {
        title: newTitle,
        name: newTitle,
        category: item.category,
        year: item.year || String(new Date().getFullYear()),
        medium: item.medium || '',
        dimensions: item.dimensions || '',
        origin: item.origin || '',
        status: item.status || 'Διαθέσιμο',
        description: item.description || '',
        details: item.details || [],
        featured: false,
        inquiryOnly: item.inquiryOnly !== false,
        image: first?.url || '',
        imageUrl: first?.url || '',
        fileType: first?.type || 'image',
        mediaList,
        isDeleted: false,
        deletedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const { updatedAt, createdAt, ...fields } = record;
      await savePatches([{ id: doc(collection(db, 'portfolio')).id, fields: { ...fields, createdAt: Timestamp.now() } }], 'ADD', 'Κλωνοποίηση έργου Portfolio', newTitle);
      setOrderMessage(`Το έργο «${newTitle}» δημιουργήθηκε με επιτυχία!`);
      notifyOperationSuccess('Κλωνοποίηση Έργου', `Το έργο «${newTitle}» δημιουργήθηκε με επιτυχία!`);
    } catch (err: any) {
      setError(`Αποτυχία αντιγραφής: ${err.message}`);
      notifyOperationError('Σφάλμα Αντιγραφής', err.message);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving || uploading) return;
    if (!form.title.trim()) {
      setError('Χρειάζεται τίτλος έργου.');
      setEditorTab('basics');
      return;
    }
    if (!form.mediaList.length) {
      setError('Χρειάζεται τουλάχιστον μία εικόνα ή βίντεο.');
      setEditorTab('media');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const record = buildPortfolioRecord(form, serverTimestamp());
      const target = form.id ? doc(db, 'portfolio', form.id) : doc(collection(db, 'portfolio'));
      const seed = ART_ITEMS.find(item => item.id === form.id);
      await runTransaction(db, async tx => {
        const snap = await tx.get(target);
        const before = snap.data() || null;
        if (form.id && !before && !seed) throw new Error('Το έργο έχει διαγραφεί.');
        const current = { ...seed, ...before } as PortfolioRecord;
        const baseline = formBaseline.current;
        if (form.id && baseline && !equalHistoryValue(portfolioMedia(baseline), portfolioMedia(current))) {
          throw new Error('Οι εικόνες του έργου άλλαξαν. Άνοιξε ξανά τη φόρμα.');
        }
        const { updatedAt, ...fields } = record;
        tx.set(target, { ...record, ...(!snap.exists() ? { createdAt: serverTimestamp() } : {}) }, { merge: true });
        stageHistory(db, tx, {
          type: form.id ? 'PORTFOLIO_UPDATE' : 'ADD', collection: 'portfolio', id: target.id, name: form.title,
          message: form.id && !equalHistoryValue(portfolioMedia(current), form.mediaList) ? 'Αλλαγή εικόνων έργου Portfolio' : 'Αποθήκευση έργου Portfolio',
          timestamp: new Date().toISOString(), before, after: { ...before, ...fields }
        });
      });
      const kept = new Set(form.mediaList.flatMap(media => [media.url, media.originalUrl]));
      await Promise.all([...pendingUploads.current.keys()].filter(url => !kept.has(url)).map(discardPendingUpload));
      pendingUploads.current.clear();
      setForm(null);
      notifyOperationSuccess(form.id ? 'Ενημέρωση Έργου' : 'Νέο Έργο', `Το έργο «${form.title.trim()}» αποθηκεύτηκε επιτυχώς.`);
    } catch (err: any) {
      setError(`Δεν αποθηκεύτηκε: ${err.message}`);
      notifyOperationError('Σφάλμα Αποθήκευσης', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: PortfolioRecord) => {
    if (!window.confirm(`Να αρχειοθετηθεί το έργο «${item.title || item.name}» από το Portfolio;`))
      return;
    try {
      await savePatches([{ id: item.id, fields: { isDeleted: true, deletedAt: Timestamp.now() } }], 'PORTFOLIO_UPDATE', 'Αρχειοθέτηση έργου', item.title);
      notifyOperationSuccess('Αρχειοθέτηση Έργου', `Το έργο «${item.title || item.name}» αρχειοθετήθηκε.`);
    } catch (err: any) {
      setError(`Δεν αφαιρέθηκε: ${err.message}`);
      notifyOperationError('Σφάλμα Αρχειοθέτησης', err.message);
    }
  };

  const restore = async (item: PortfolioRecord) => {
    try {
      await savePatches([{ id: item.id, fields: { isDeleted: false, deletedAt: null } }], 'PORTFOLIO_UPDATE', 'Επαναφορά έργου', item.title);
      notifyOperationSuccess('Επαναφορά Έργου', `Το έργο «${item.title || item.name}» επανήλθε στην ενεργή έκθεση.`);
    } catch (err: any) {
      setError(`Δεν έγινε επαναφορά: ${err.message}`);
      notifyOperationError('Σφάλμα Επαναφοράς', err.message);
    }
  };

  const bulkArchive = async () => {
    if (!selectedItems.length || !window.confirm(`Να αρχειοθετηθούν ${selectedItems.length} έργα;`))
      return;
    try {
      await savePatches(selectedItems.map(item => ({ id: item.id, fields: { isDeleted: true, deletedAt: Timestamp.now() } })), 'PORTFOLIO_UPDATE', 'Μαζική αρχειοθέτηση έργων');
      setSelectedIds([]);
      setOrderMessage(`Αρχειοθετήθηκαν ${selectedItems.length} έργα.`);
      notifyOperationSuccess('Μαζική Αρχειοθέτηση', `Αρχειοθετήθηκαν ${selectedItems.length} έργα.`);
    } catch (err: any) {
      setError(`Δεν ολοκληρώθηκε η μαζική αρχειοθέτηση: ${err.message}`);
      notifyOperationError('Σφάλμα Μαζικής Αρχειοθέτησης', err.message);
    }
  };

  const bulkRestore = async () => {
    if (!selectedItems.length || !window.confirm(`Να επαναφερθούν ${selectedItems.length} έργα;`))
      return;
    try {
      await savePatches(selectedItems.map(item => ({ id: item.id, fields: { isDeleted: false, deletedAt: null } })), 'PORTFOLIO_UPDATE', 'Μαζική επαναφορά έργων');
      setSelectedIds([]);
      setOrderMessage(`Επαναφέρθηκαν ${selectedItems.length} έργα.`);
      notifyOperationSuccess('Μαζική Επαναφορά', `Επαναφέρθηκαν ${selectedItems.length} έργα.`);
    } catch (err: any) {
      setError(`Δεν ολοκληρώθηκε η μαζική επαναφορά: ${err.message}`);
      notifyOperationError('Σφάλμα Μαζικής Επαναφοράς', err.message);
    }
  };

  const handleApplyBulkEdit = async (patch: any) => {
    try {
      await savePatches(selectedItems.map(item => ({ id: item.id, fields: patch })), 'PORTFOLIO_UPDATE', 'Μαζική επεξεργασία έργων');
      setSelectedIds([]);
      setOrderMessage(`Ενημερώθηκαν ${selectedItems.length} έργα με επιτυχία!`);
      notifyOperationSuccess('Μαζική Επεξεργασία', `Ενημερώθηκαν ${selectedItems.length} έργα με επιτυχία!`);
    } catch (err: any) {
      setError(`Αποτυχία μαζικής επεξεργασίας: ${err.message}`);
      notifyOperationError('Σφάλμα Μαζικής Επεξεργασίας', err.message);
    }
  };

  const exportCsv = () => {
    const columns = [
      'id',
      'title',
      'category',
      'year',
      'medium',
      'dimensions',
      'origin',
      'status',
      'description',
      'featured',
      'inquiryOnly',
      'image'
    ];
    const csv = buildCsv(columns, items.map(item => columns.map(key => (item as any)[key])));
    downloadCsv(csv, 'aram-portfolio.csv');
    notifyOperationSuccess('Εξαγωγή CSV', 'Το αρχείο aram-portfolio.csv δημιουργήθηκε και ξεκίνησε η λήψη.');
  };

  const getStatusColor = (st: string) => {
    if (st === 'Διαθέσιμο') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (st === 'Κρατημένο') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (st === 'Πουλήθηκε' || st === 'Μη διαθέσιμο')
      return 'bg-stone-200 text-stone-700 border-stone-300';
    return 'bg-violet-100 text-violet-800 border-violet-200';
  };

  return {
    reorder, edit, cloneItem, save, remove, restore, bulkArchive, bulkRestore, handleApplyBulkEdit, exportCsv,
    getStatusColor
  };
}

export type PortfolioActions = ReturnType<typeof createPortfolioActions>;
