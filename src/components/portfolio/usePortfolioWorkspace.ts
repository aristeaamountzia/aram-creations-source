import React, { useEffect, useState, useRef, useReducer } from 'react';
import { VideoProgress } from '../../lib/video-compression';
import { deleteObject, type StorageReference } from 'firebase/storage';
import { editDraft } from './portfolio-model';
import type { Form, EditorTab, PortfolioRecord } from './portfolio-model';
import type { PortfolioCatalog } from './usePortfolioCatalog';

type Dependencies = Pick<PortfolioCatalog, 'setError'>;

export function usePortfolioWorkspace(dependencies: Dependencies) {
  const { setError } = dependencies;

  const [draft, dispatchDraft] = useReducer(editDraft, { form: null, past: [], future: [] });

  const form = draft.form;

  const setForm = (update: React.SetStateAction<Form | null>) => dispatchDraft({ update });

  const [editorTab, setEditorTab] = useState<EditorTab>('basics');
  const [inspectItem, setInspectItem] = useState<PortfolioRecord | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [imageEditorTarget, setImageEditorTarget] = useState<{
    url: string;
    mediaIndex: number;
    itemId?: string;
    originalUrl?: string;
    title?: string;
  } | null>(null);

  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [videoCompressing, setVideoCompressing] = useState(false);
  const videoAbort = useRef<AbortController | null>(null);
  const formBaseline = useRef<PortfolioRecord | null>(null);
  const pendingUploads = useRef<Map<string, StorageReference>>(new Map());

  const discardPendingUpload = async (url: string) => {
    const storageReference = pendingUploads.current.get(url);
    if (!storageReference) return;
    pendingUploads.current.delete(url);
    await deleteObject(storageReference).catch(() => undefined);
  };

  const closeEditor = async () => {
    videoAbort.current?.abort();
    const references = Array.from(pendingUploads.current.values());
    pendingUploads.current.clear();
    await Promise.allSettled(references.map(storageReference => deleteObject(storageReference)));
    setForm(null);
    setVideoProgress(null);
    setError('');
  };

  useEffect(() => () => {
    videoAbort.current?.abort();
    const references = Array.from(pendingUploads.current.values());
    pendingUploads.current.clear();
    void Promise.allSettled(references.map(storageReference => deleteObject(storageReference)));
  }, []);

  return {
    draft, dispatchDraft, form, setForm, editorTab, setEditorTab, inspectItem, setInspectItem, isBulkEditOpen,
    setIsBulkEditOpen, imageEditorTarget, setImageEditorTarget, newMediaUrl, setNewMediaUrl, uploading,
    setUploading, saving, setSaving, reordering, setReordering, draggedId, setDraggedId, orderMessage,
    setOrderMessage, videoProgress, setVideoProgress, videoCompressing, setVideoCompressing, videoAbort,
    formBaseline, pendingUploads, discardPendingUpload, closeEditor
  };
}

export type PortfolioWorkspace = ReturnType<typeof usePortfolioWorkspace>;
