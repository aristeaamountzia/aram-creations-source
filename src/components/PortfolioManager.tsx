import React, { useEffect, useMemo, useState, useRef } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { usePortfolioDesign } from '../lib/use-portfolio-design';
import { WixProjectExport } from './WixProjectExport';
import { portfolioStatusLabel } from '../lib/portfolio-settings';
import { portfolioMedia, isVideoUrl } from '../lib/video-links';
import { VideoPlayer } from './VideoPlayer';
import { MediaDownload } from './MediaDownload';
import { CatalogExcelExport } from './CatalogExcelExport';
import { CatalogControls } from './CatalogControls';
import { VideoUploadStatus } from './VideoUploadStatus';
import { prepareVideoUpload, VideoProgress } from '../lib/video-compression';
import { VIDEO_UPLOAD_HELP, VIDEO_UPLOAD_LIMIT } from '../lib/video-policy';
import { ImageEditorModal } from './ImageEditorModal';
import { BulkEditModal } from './BulkEditModal';
import { ItemDetailModal } from './ItemDetailModal';
import {
  addDoc,
  collection,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { ART_ITEMS } from '../data';
import { persistHistory } from '../lib/catalog-history';
import { sortPortfolio, movePortfolio } from '../lib/portfolio-order';
import { ArtItem, CategoryId } from '../types';

type PortfolioRecord = ArtItem & {
  isDeleted?: boolean;
  name?: string;
  imageUrl?: string;
  deletedAt?: unknown;
};
type Media = { url: string; type: 'image' | 'video'; title?: string };
type EditorTab = 'basics' | 'details' | 'media' | 'ai';
type StatsFilter = 'active' | 'archived' | 'featured' | 'all';
type SortOption = 'portfolio_order' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc';

const emptyForm = () => ({
  id: '',
  title: '',
  category: 'handcrafted-memories' as CategoryId,
  year: String(new Date().getFullYear()),
  medium: '',
  dimensions: '',
  origin: '',
  status: 'Διαθέσιμο',
  description: '',
  detailsText: '',
  featured: false,
  inquiryOnly: true,
  mediaList: [] as Media[]
});

const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);
const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);
const IconClone = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
    />
  </svg>
);
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);
const IconSettings = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const IconGrid = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);
const IconList = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconUndo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
);

export interface PortfolioManagerProps {
  onBack: () => void;
  onNavigateOrders?: () => void;
  onOpenSettings?: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  onBack,
  onNavigateOrders,
  onOpenSettings,
  currentUser,
  onSignOut
}) => {
  const design = usePortfolioDesign();
  const [remote, setRemote] = useState<PortfolioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [statsFilter, setStatsFilter] = useState<StatsFilter>('active');
  const [sortBy, setSortBy] = useState<SortOption>('portfolio_order');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [lassoRect, setLassoRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const lassoStartRef = useRef<{ x: number; y: number; bounds: DOMRect } | null>(null);
  const lassoBaseSelectionRef = useRef<string[]>([]);
  const portfolioGridRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Modals & Editing state
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>('basics');
  const [inspectItem, setInspectItem] = useState<PortfolioRecord | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [imageEditorTarget, setImageEditorTarget] = useState<{
    url: string;
    mediaIndex?: number;
    title?: string;
  } | null>(null);

  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ title?: string; description?: string } | null>(
    null
  );
  const [aiWorking, setAiWorking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [videoCompressing, setVideoCompressing] = useState(false);
  const videoAbort = useRef<AbortController | null>(null);

  useEffect(() => () => videoAbort.current?.abort(), []);

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'portfolio'),
        snapshot => {
          setRemote(
            snapshot.docs.map(item => ({ ...item.data(), id: item.id } as PortfolioRecord))
          );
          setLoading(false);
          setError('');
        },
        err => {
          setLoading(false);
          setError(`Δεν φορτώθηκε το Portfolio: ${err.message}`);
        }
      ),
    []
  );

  const allItems = useMemo(() => {
    const merged = new Map<string, PortfolioRecord>(ART_ITEMS.map(item => [item.id, item]));
    remote.forEach(item =>
      merged.set(item.id, { ...merged.get(item.id), ...item } as PortfolioRecord)
    );
    return sortPortfolio(Array.from(merged.values()));
  }, [remote]);

  // Metric counts for dashboard summary
  const metrics = useMemo(() => {
    const total = allItems.length;
    const active = allItems.filter(item => !item.isDeleted && !item.deletedAt).length;
    const archived = allItems.filter(item => Boolean(item.isDeleted || item.deletedAt)).length;
    const featured = allItems.filter(
      item => Boolean(item.featured) && !item.isDeleted && !item.deletedAt
    ).length;
    let mediaTotal = 0;
    allItems.forEach(item => {
      mediaTotal += portfolioMedia(item).length;
    });
    return { total, active, archived, featured, mediaTotal };
  }, [allItems]);

  // Filtered & sorted items
  const items = useMemo(() => {
    return allItems
      .filter(item => {
        const isArchived = Boolean(item.isDeleted || item.deletedAt);
        if (statsFilter === 'active' && isArchived) return false;
        if (statsFilter === 'archived' && !isArchived) return false;
        if (statsFilter === 'featured' && (isArchived || !item.featured)) return false;

        const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
        const text = `${item.title || item.name} ${item.description || ''} ${item.medium || ''} ${item.dimensions || ''} ${item.year || ''}`;
        const matchQuery = text.toLocaleLowerCase('el').includes(query.toLocaleLowerCase('el'));

        return matchCat && matchQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'year_desc') return (Number(b.year) || 0) - (Number(a.year) || 0);
        if (sortBy === 'year_asc') return (Number(a.year) || 0) - (Number(b.year) || 0);
        if (sortBy === 'title_asc')
          return (a.title || a.name || '').localeCompare(b.title || b.name || '', 'el');
        if (sortBy === 'title_desc')
          return (b.title || b.name || '').localeCompare(a.title || a.name || '', 'el');
        return 0; // default: already sorted by portfolio_order
      });
  }, [allItems, statsFilter, categoryFilter, query, sortBy]);

  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const visibleItemIds = useMemo(() => items.map(item => item.id), [items]);

  const selectItem = (id: string, shiftKey = false) => {
    if (shiftKey && selectionAnchorId) {
      const start = visibleItemIds.indexOf(selectionAnchorId);
      const end = visibleItemIds.indexOf(id);
      if (start >= 0 && end >= 0) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const range = visibleItemIds.slice(min, max + 1);
        setSelectedIds(prev => Array.from(new Set([...prev, ...range])));
        return;
      }
    }
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]));
    setSelectionAnchorId(id);
  };

  const handleArtworkSelectionClick = (event: React.MouseEvent, id: string) => {
    if (!event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, label, a, select, textarea')) return;
    event.preventDefault();
    selectItem(id, true);
  };

  const finishLassoSelection = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && event.currentTarget) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {}
    }
    lassoStartRef.current = null;
    setLassoRect(null);
  };

  const handleLassoStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-product-id], button, input, label, a, select, textarea')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    lassoStartRef.current = { x: event.clientX, y: event.clientY, bounds };
    lassoBaseSelectionRef.current = event.shiftKey ? selectedIds : [];
    if (!event.shiftKey) setSelectedIds([]);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
    setLassoRect({ left: event.clientX - bounds.left, top: event.clientY - bounds.top, width: 0, height: 0 });
  };

  const handleLassoMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = lassoStartRef.current;
    if (!start || !portfolioGridRef.current) return;
    const left = Math.min(start.x, event.clientX);
    const top = Math.min(start.y, event.clientY);
    const right = Math.max(start.x, event.clientX);
    const bottom = Math.max(start.y, event.clientY);
    setLassoRect({ left: left - start.bounds.left, top: top - start.bounds.top, width: right - left, height: bottom - top });
    const touched = Array.from(portfolioGridRef.current.querySelectorAll('[data-product-id]'))
      .filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
      })
      .map(node => (node as HTMLElement).dataset.productId)
      .filter(Boolean) as string[];
    setSelectedIds(Array.from(new Set([...lassoBaseSelectionRef.current, ...touched])));
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectItem) { setInspectItem(null); return; }
        if (isBulkEditOpen) { setIsBulkEditOpen(false); return; }
        if (imageEditorTarget) { setImageEditorTarget(null); return; }
        if (form && !saving && !uploading) { notifyOperationSuccess(form.id ? 'Ενημέρωση Έργου' : 'Νέο Έργο', `Το έργο «${form.title.trim()}» αποθηκεύτηκε επιτυχώς.`);
      setForm(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectItem, isBulkEditOpen, imageEditorTarget, form, saving, uploading]);

  // Reordering logic
  const reorder = async (movingId: string, targetId: string) => {
    if (reordering || statsFilter !== 'active') return;
    const active = allItems.filter(item => !item.isDeleted && !item.deletedAt);
    const ordered = movePortfolio(active, movingId, targetId);
    if (ordered === active) return;
    setReordering(true);
    setError('');
    setOrderMessage('Αποθήκευση σειράς…');
    try {
      if (ordered.length > 500) throw new Error('Η σειρά περιέχει πάνω από 500 έργα.');
      const batch = writeBatch(db);
      ordered.forEach((item, index) =>
        batch.set(
          doc(db, 'portfolio', item.id),
          { portfolioOrder: index, updatedAt: serverTimestamp() },
          { merge: true }
        )
      );
      await batch.commit();
      await persistHistory(db, {
        type: 'PORTFOLIO_ORDER',
        collection: 'portfolio',
        message: 'Αλλαγή σειράς Portfolio',
        timestamp: new Date().toISOString(),
        before: active.map(item => ({
          id: item.id,
          ...(item.portfolioOrder !== undefined ? { portfolioOrder: item.portfolioOrder } : {})
        })),
        after: ordered.map((item, index) => ({ id: item.id, portfolioOrder: index }))
      });
      setOrderMessage('Η σειρά αποθηκεύτηκε και εφαρμόστηκε στο Portfolio.');
    } catch (err: any) {
      setError(`Δεν άλλαξε η σειρά: ${err.message}`);
      setOrderMessage('');
    } finally {
      setReordering(false);
      setDraggedId(null);
    }
  };

  const edit = (item: PortfolioRecord) => {
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
      const newDoc = await addDoc(collection(db, 'portfolio'), record);
      await persistHistory(db, {
        type: 'ADD',
        collection: 'portfolio',
        id: newDoc.id,
        name: newTitle,
        message: 'Κλωνοποίηση έργου Portfolio',
        timestamp: new Date().toISOString(),
        before: null,
        after: record
      });
      setOrderMessage(`Το έργο «${newTitle}» δημιουργήθηκε με επιτυχία!`);
      notifyOperationSuccess('Κλωνοποίηση Έργου', `Το έργο «${newTitle}» δημιουργήθηκε με επιτυχία!`);
    } catch (err: any) {
      setError(`Αποτυχία αντιγραφής: ${err.message}`);
      notifyOperationError('Σφάλμα Αντιγραφής', err.message);
    }
  };

  const addMediaUrl = () => {
    const url = newMediaUrl.trim();
    if (!/^https:\/\//i.test(url)) {
      setError('Το URL αρχείου πρέπει να αρχίζει με https://');
      return;
    }
    const type: Media['type'] = isVideoUrl(url) ? 'video' : 'image';
    setForm(current => current && { ...current, mediaList: [...current.mediaList, { url, type }] });
    setNewMediaUrl('');
    setError('');
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !form || uploading) return;
    setUploading(true);
    setError('');
    setVideoProgress(null);
    try {
      for (const file of Array.from(files)) {
        if (!/^(image|video)\//.test(file.type)) throw new Error('Επίλεξε εικόνα ή βίντεο.');
        let prepared = file;
        if (file.type.startsWith('video/')) {
          videoAbort.current = new AbortController();
          setVideoCompressing(true);
          try {
            prepared = await prepareVideoUpload(file, setVideoProgress, videoAbort.current.signal);
          } finally {
            setVideoCompressing(false);
            videoAbort.current = null;
          }
        } else if (file.size > VIDEO_UPLOAD_LIMIT) {
          throw new Error('Η εικόνα πρέπει να είναι έως 30 MB.');
        }
        const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'media';
        const fileRef = ref(
          storage,
          `jewelry/portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
        );
        await uploadBytes(fileRef, prepared, { contentType: prepared.type });
        const uploaded: Media = {
          url: await getDownloadURL(fileRef),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          title: file.name
        };
        setForm(current => current && { ...current, mediaList: [...current.mediaList, uploaded] });
      }
    } catch (err: any) {
      setError(`Δεν ανέβηκε το αρχείο: ${err.message}`);
    } finally {
      setUploading(false);
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
      const first = form.mediaList[0];
      const record = {
        title: form.title.trim(),
        name: form.title.trim(),
        category: form.category,
        year: form.year.trim(),
        medium: form.medium.trim(),
        dimensions: form.dimensions.trim(),
        origin: form.origin.trim(),
        status: form.status.trim(),
        description: form.description.trim(),
        details: form.detailsText
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean),
        featured: form.featured,
        inquiryOnly: form.inquiryOnly,
        image: first.url,
        imageUrl: first.url,
        fileType: first.type,
        mediaList: form.mediaList,
        videoUrl:
          first.type === 'video'
            ? first.url
            : form.mediaList.find(media => media.type === 'video')?.url || '',
        isDeleted: false,
        deletedAt: null,
        updatedAt: serverTimestamp()
      };
      let savedId = form.id;
      const oldRecord = form.id ? allItems.find(item => item.id === form.id) : null;
      if (form.id) {
        await setDoc(doc(db, 'portfolio', form.id), record, { merge: true });
      } else {
        savedId = (
          await addDoc(collection(db, 'portfolio'), { ...record, createdAt: serverTimestamp() })
        ).id;
      }
      const { updatedAt, ...snapshotRecord } = record;
      await persistHistory(db, {
        type: form.id ? 'PORTFOLIO_UPDATE' : 'ADD',
        collection: 'portfolio',
        id: savedId,
        name: form.title,
        message: 'Αποθήκευση έργου Portfolio',
        timestamp: new Date().toISOString(),
        before: oldRecord || null,
        after: { ...oldRecord, ...snapshotRecord }
      });
      setForm(null);
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
      const itemRef = doc(db, 'portfolio', item.id);
      await setDoc(
        itemRef,
        { isDeleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      );
      await persistHistory(db, {
        type: 'PORTFOLIO_ARCHIVE',
        collection: 'portfolio',
        id: item.id,
        name: item.title,
        message: 'Αρχειοθέτηση έργου Portfolio',
        timestamp: new Date().toISOString(),
        before: item,
        after: { ...item, ...(await getDoc(itemRef)).data() }
      });
      notifyOperationSuccess('Αρχειοθέτηση Έργου', `Το έργο «${item.title || item.name}» αρχειοθετήθηκε.`);
    } catch (err: any) {
      setError(`Δεν αφαιρέθηκε: ${err.message}`);
      notifyOperationError('Σφάλμα Αρχειοθέτησης', err.message);
    }
  };

  const restore = async (item: PortfolioRecord) => {
    try {
      await setDoc(
        doc(db, 'portfolio', item.id),
        { isDeleted: false, deletedAt: null, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await persistHistory(db, {
        type: 'PORTFOLIO_RESTORE',
        collection: 'portfolio',
        id: item.id,
        name: item.title,
        message: 'Επαναφορά έργου Portfolio',
        timestamp: new Date().toISOString(),
        before: item,
        after: { ...item, isDeleted: false, deletedAt: null }
      });
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
      const batch = writeBatch(db);
      selectedItems.forEach(item =>
        batch.set(
          doc(db, 'portfolio', item.id),
          { isDeleted: true, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() },
          { merge: true }
        )
      );
      await batch.commit();
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
      const batch = writeBatch(db);
      selectedItems.forEach(item =>
        batch.set(
          doc(db, 'portfolio', item.id),
          { isDeleted: false, deletedAt: null, updatedAt: serverTimestamp() },
          { merge: true }
        )
      );
      await batch.commit();
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
      const batch = writeBatch(db);
      selectedItems.forEach(item =>
        batch.set(
          doc(db, 'portfolio', item.id),
          { ...patch, updatedAt: serverTimestamp() },
          { merge: true }
        )
      );
      await batch.commit();
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
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
      columns.join(','),
      ...items.map(item => columns.map(key => quote((item as any)[key])).join(','))
    ].join('\r\n');
    const href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'aram-portfolio.csv';
    link.click();
    URL.revokeObjectURL(href);
    notifyOperationSuccess('Εξαγωγή CSV', 'Το αρχείο aram-portfolio.csv δημιουργήθηκε και ξεκίνησε η λήψη.');
  };

  const generateAiSuggestion = async (task: 'full' | 'title' | 'description') => {
    if (!form) return;
    setAiWorking(true);
    setError('');
    setAiSuggestion(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Συνδέσου ξανά ως διαχειριστής.');
      const response = await fetch('/api/backoffice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'portfolio_item',
          task,
          prompt: aiPrompt,
          product: {
            name: form.title,
            category: form.category,
            year: form.year,
            medium: form.medium,
            dimensions: form.dimensions,
            description: form.description
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Το AI endpoint δεν απάντησε σωστά.');
      setAiSuggestion({ title: data.title, description: data.description });
    } catch (err: any) {
      setError(`AI: ${err.message}`);
    } finally {
      setAiWorking(false);
    }
  };

  const getStatusColor = (st: string) => {
    if (st === 'Διαθέσιμο') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (st === 'Κρατημένο') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (st === 'Πουλήθηκε' || st === 'Μη διαθέσιμο')
      return 'bg-stone-200 text-stone-700 border-stone-300';
    return 'bg-violet-100 text-violet-800 border-violet-200';
  };

  return (
    <main className="backoffice-view min-h-screen p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20 relative">
      {/* 1. Unified Back Office Header */}
      <header className="backoffice-toolbar flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Κατάλογος">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            onClick={onNavigateOrders || onBack}
            className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition"
          >
            Παραγγελίες
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            onClick={onBack}
            className="px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition"
          >
            Shop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-bold shadow-xs"
          >
            Portfolio
          </button>
        </div>

        <div className="backoffice-actions flex flex-col gap-3 w-full lg:w-auto">
          {/* Primary Action Row */}
          <div className="backoffice-primary-actions flex flex-wrap items-center justify-start lg:justify-end gap-3">
            <button
              onClick={() => {
                setForm(emptyForm());
                setVideoProgress(null);
                setEditorTab('basics');
                setAiSuggestion(null);
                setError('');
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-bold transition shadow-md"
            >
              <IconPlus /> Νέα Καταχώρηση Έργου
            </button>
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-xs font-bold min-w-0">
                <span className="max-w-[190px] truncate">{currentUser.email}</span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-emerald-900 underline underline-offset-2 whitespace-nowrap"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Utility Action Row */}
          <div className="backoffice-utility-actions flex flex-wrap items-center justify-start lg:justify-end gap-2 pt-3 border-t border-stone-100">
            <CatalogExcelExport />
            <WixProjectExport />
            <button
              onClick={exportCsv}
              className="flex items-center justify-center px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition font-bold text-xs"
              title="Εξαγωγή CSV Portfolio"
            >
              <IconDownload /> <span className="ml-1.5">CSV</span>
            </button>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
                title="Ρυθμίσεις Portfolio & Design"
              >
                <IconSettings />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 mb-6">
          {error}
        </div>
      )}

      {/* Success / reorder status */}
      {orderMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 mb-6 flex justify-between items-center animate-fade-in">
          <span>{orderMessage}</span>
          <button onClick={() => setOrderMessage('')} className="text-emerald-900 text-xs underline">
            Κλείσιμο
          </button>
        </div>
      )}

      {/* 2. Unified Portfolio Statistics Widgets */}
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

      {/* 3. Unified CatalogControls & Filters */}
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

      {/* 4. Unified Bulk Action Bar */}
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

      {/* 5. Artwork Grid / List Views */}
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
                              url: first.url,
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
      )}

      {/* 6. Form Modal: Edit / Add Artwork */}
      {form && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? 'Επεξεργασία έργου' : 'Νέο έργο'}
          onClick={e => {
            if (e.target === e.currentTarget && !saving && !uploading) setForm(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center cursor-pointer"
        >
          <form
            onSubmit={save}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl my-6 flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 animate-fade-in cursor-default"
          >
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 p-5 shrink-0">
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
                      <img src={preview} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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
                onClick={() => setForm(null)}
                aria-label="Κλείσιμο"
                className="p-2 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition"
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
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Ανέβασμα Φωτογραφιών ή Βίντεο
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploading}
                      onChange={e => upload(e.target.files)}
                      className="w-full rounded-xl border border-stone-200 p-3 text-xs bg-stone-50 focus:bg-white"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">{VIDEO_UPLOAD_HELP}</p>
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
                      onClick={addMediaUrl}
                      className="px-4 py-2 border border-stone-200 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 transition"
                    >
                      + Προσθήκη URL
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {form.mediaList.map((media, index) => (
                      <div
                        key={`${media.url}-${index}`}
                        className="overflow-hidden rounded-xl border border-stone-200 p-2 bg-stone-50 space-y-2"
                      >
                        <div className="aspect-square w-full rounded-lg bg-stone-200 overflow-hidden relative">
                          {media.type === 'video' ? (
                            <VideoPlayer url={media.url} title={media.title || form.title} />
                          ) : (
                            <img src={media.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          )}
                          {index === 0 && (
                            <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              Κεντρική
                            </span>
                          )}
                        </div>

                        <input
                          aria-label={`Λεζάντα media ${index + 1}`}
                          value={media.title || ''}
                          onChange={e =>
                            setForm(current =>
                              current && {
                                ...current,
                                mediaList: current.mediaList.map((entry, i) =>
                                  i === index ? { ...entry, title: e.target.value } : entry
                                )
                              }
                            )
                          }
                          placeholder="Λεζάντα εικόνας..."
                          className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-[11px] outline-none"
                        />

                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {media.type !== 'video' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (/\.gif($|\?)/i.test(media.url)) {
                                  setOrderMessage('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται.');
                                  return;
                                }
                                setImageEditorTarget({
                                  url: media.url,
                                  mediaIndex: index,
                                  title: form.title
                                });
                              }}
                              className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded font-bold"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() =>
                              setForm(current => {
                                if (!current) return current;
                                const next = [...current.mediaList];
                                const [chosen] = next.splice(index, 1);
                                next.unshift(chosen);
                                return { ...current, mediaList: next };
                              })
                            }
                            className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30"
                          >
                            Κεντρική
                          </button>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() =>
                              setForm(current => {
                                if (!current) return current;
                                const next = [...current.mediaList];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                return { ...current, mediaList: next };
                              })
                            }
                            className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === form.mediaList.length - 1}
                            onClick={() =>
                              setForm(current => {
                                if (!current) return current;
                                const next = [...current.mediaList];
                                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                return { ...current, mediaList: next };
                              })
                            }
                            className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm(
                                current =>
                                  current && {
                                    ...current,
                                    mediaList: current.mediaList.filter((_, i) => i !== index)
                                  }
                              )
                            }
                            className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold ml-auto"
                          ><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
                  onClick={() => setForm(null)}
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
      )}

      {/* 7. Image Editor Modal */}
      {imageEditorTarget && (
        <ImageEditorModal
          open={Boolean(imageEditorTarget)}
          imageUrl={imageEditorTarget.url}
          title={imageEditorTarget.title}
          onClose={() => setImageEditorTarget(null)}
          onSave={dataUrl => {
            if (form && imageEditorTarget.mediaIndex !== undefined) {
              setForm(current => {
                if (!current) return current;
                const nextMedia = [...current.mediaList];
                nextMedia[imageEditorTarget.mediaIndex!] = {
                  ...nextMedia[imageEditorTarget.mediaIndex!],
                  url: dataUrl
                };
                return { ...current, mediaList: nextMedia };
              });
            }
            setImageEditorTarget(null);
            setOrderMessage('Η εικόνα επεξεργάστηκε επιτυχώς!');
          }}
        />
      )}

      {/* 8. Item Detail Modal */}
      {inspectItem && (
        <ItemDetailModal
          open={Boolean(inspectItem)}
          item={inspectItem}
          mode="portfolio"
          categoryLabel={
            design.categories.find(c => c.id === inspectItem.category)?.title ||
            inspectItem.category
          }
          onClose={() => setInspectItem(null)}
          onEdit={it => edit(it)}
          onClone={it => cloneItem(it)}
          onDelete={it => remove(it)}
          onEditImage={imgUrl => {
            if (/\.gif($|\?)/i.test(imgUrl)) {
              setOrderMessage('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται.');
              return;
            }
            setImageEditorTarget({ url: imgUrl, title: inspectItem.title || inspectItem.name });
          }}
        />
      )}

      {/* 9. Bulk Edit Modal */}
      {isBulkEditOpen && (
        <BulkEditModal
          open={isBulkEditOpen}
          selectedCount={selectedItems.length}
          mode="portfolio"
          categories={design.categories.map(c => ({ id: c.id, label: c.title }))}
          statuses={design.statuses.map(s => s.label)}
          onClose={() => setIsBulkEditOpen(false)}
          onApply={handleApplyBulkEdit}
        />
      )}
    </main>
  );
};
