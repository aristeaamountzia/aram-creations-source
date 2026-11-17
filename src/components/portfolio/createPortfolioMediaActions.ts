import { portfolioMedia, isVideoUrl, videoLink } from '../../lib/video-links';
import { prepareVideoUpload } from '../../lib/video-compression';
import { validateMediaFile, validatePreparedMedia, verifyStoredMedia } from '../../lib/media-validation';
import { doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import {
  deleteObject, getDownloadURL, ref, type StorageReference, uploadBytes, uploadBytesResumable
} from 'firebase/storage';
import { db, storage } from '../../firebase';
import { ART_ITEMS } from '../../data';
import { stageHistory } from '../../lib/catalog-history';
import { replacePortfolioImage, portfolioMediaFields } from '../../lib/portfolio-record';
import type { Media, PortfolioRecord } from './portfolio-model';
import { compressPortfolioImage } from './portfolio-image';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioCatalog } from './usePortfolioCatalog';

type Dependencies = Pick<
  PortfolioWorkspace,
  'newMediaUrl' | 'setForm' | 'setNewMediaUrl' | 'form' | 'pendingUploads' | 'setUploading' |
  'setVideoCompressing' | 'setVideoProgress' | 'uploading' | 'videoAbort' | 'imageEditorTarget' |
  'setOrderMessage'
> &
  Pick<PortfolioCatalog, 'setError'>;

export function createPortfolioMediaActions(dependencies: Dependencies) {
  const {
    newMediaUrl, setError, setForm, setNewMediaUrl, form, pendingUploads, setUploading, setVideoCompressing,
    setVideoProgress, uploading, videoAbort, imageEditorTarget, setOrderMessage
  } = dependencies;

  const addMediaUrl = async () => {
    const url = newMediaUrl.trim();
    if (!/^https:\/\//i.test(url)) {
      setError('Το URL αρχείου πρέπει να αρχίζει με https://');
      return;
    }
    const type: Media['type'] = isVideoUrl(url) ? 'video' : 'image';
    try {
      if (!videoLink(url)) await verifyStoredMedia(url, type);
      setForm(current => current && { ...current, mediaList: [...current.mediaList, { url, type }] });
      setNewMediaUrl('');
      setError('');
    } catch (err: any) {
      setError(`Το εξωτερικό URL δεν φορτώνει ως ${type === 'video' ? 'βίντεο' : 'εικόνα'}: ${err.message}`);
    }
  };

  const upload = async (files: FileList | File[] | null) => {
    if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0) || !form || uploading) return;
    setUploading(true);
    setError('');
    setVideoProgress(null);
    try {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      for (const file of fileList) {
        const sourceMedia = await validateMediaFile(file);
        const isImage = sourceMedia.kind === 'image';
        const isVideo = sourceMedia.kind === 'video';
        let prepared = file;
        if (isVideo) {
          videoAbort.current = new AbortController();
          setVideoCompressing(true);
          try {
            prepared = await prepareVideoUpload(file, setVideoProgress, videoAbort.current.signal);
          } finally {
            setVideoCompressing(false);
            videoAbort.current = null;
          }
        } else {
          prepared = await compressPortfolioImage(file);
        }
        const validated = await validatePreparedMedia(prepared, sourceMedia.kind);
        const safeName = prepared.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'media';
        const fileRef = ref(
          storage,
          `jewelry/portfolio/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
        );
        const uploadTask = uploadBytesResumable(fileRef, prepared, {
          contentType: validated.mime,
          cacheControl: 'public, max-age=31536000, immutable'
        });
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            snapshot => {
              const pct =
                snapshot.totalBytes > 0
                  ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                  : 0;
              setVideoProgress({
                text: `Ανέβασμα στο Cloud ${prepared.name}: ${pct}%`,
                percent: pct
              });
            },
            reject,
            () => resolve()
          );
        });
        let downloadUrl: string;
        try {
          downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await verifyStoredMedia(downloadUrl, sourceMedia.kind);
        } catch (verificationError) {
          await deleteObject(uploadTask.snapshot.ref).catch(() => undefined);
          throw verificationError;
        }
        pendingUploads.current.set(downloadUrl, uploadTask.snapshot.ref);
        const uploaded: Media = {
          url: downloadUrl,
          type: isVideo ? 'video' : 'image',
          title: file.name
        };
        setVideoProgress({
          text: `Ολοκληρώθηκε το ανέβασμα: ${file.name} (100%)`,
          percent: 100
        });
        setForm(current => current && { ...current, mediaList: [...current.mediaList, uploaded] });
      }
    } catch (err: any) {
      setVideoProgress(null);
      setError(err instanceof TypeError && err.message === 'Failed to fetch'
        ? 'Η σύνδεση διακόπηκε κατά το ανέβασμα ή τον έλεγχο του αρχείου. Δοκίμασε ξανά.'
        : `Δεν ανέβηκε το αρχείο: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const saveImageEdit = async image => {
    const target = imageEditorTarget;
    let newObject: StorageReference | undefined;
    setUploading(true);
    try {
      let url: string;
      if (typeof image === 'string') {
        if (image !== target.originalUrl) throw new Error('Δεν βρέθηκε η αρχική εικόνα.');
        url = image;
      } else {
        const file = new File([image], 'portfolio-edited.jpg', { type: image.type });
        const validated = await validatePreparedMedia(file, 'image');
        const storageRef = ref(storage, 'jewelry/portfolio/' + crypto.randomUUID() + '-edited.jpg');
        await uploadBytes(storageRef, file, { contentType: validated.mime, cacheControl: 'public, max-age=31536000, immutable' });
        newObject = storageRef;
        url = await getDownloadURL(storageRef);
        await verifyStoredMedia(url, 'image');
      }

      if (target.itemId) {
        const project = doc(db, 'portfolio', target.itemId);
        const seed = ART_ITEMS.find(item => item.id === target.itemId);
        await runTransaction(db, async tx => {
          const snapshot = await tx.get(project);
          const before = snapshot.data() || null;
          if (!before && !seed) throw new Error('Το έργο έχει διαγραφεί.');
          const current = { ...seed, ...before } as PortfolioRecord;
          const media = replacePortfolioImage(portfolioMedia(current), target.mediaIndex, target.url, url);
          const fields = portfolioMediaFields(media);
          tx.set(project, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
          stageHistory(db, tx, {
            type: 'PORTFOLIO_IMAGE_EDIT', collection: 'portfolio', id: project.id, name: current.title || current.name || '',
            message: typeof image === 'string' ? 'Επαναφορά αρχικής εικόνας' : 'Επεξεργασία εικόνας Portfolio',
            timestamp: new Date().toISOString(), before, after: { ...before, ...fields }
          });
        });
        setOrderMessage('Η αλλαγή εικόνας αποθηκεύτηκε στο έργο.');
      } else if (form) {
        const mediaList = replacePortfolioImage(form.mediaList, target.mediaIndex, target.url, url);
        if (newObject) pendingUploads.current.set(url, newObject);
        setForm(current => current && { ...current, mediaList });
      } else throw new Error('Η φόρμα έκλεισε.');
    } catch (error) {
      if (newObject) await deleteObject(newObject).catch(() => undefined);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { addMediaUrl, upload, saveImageEdit };
}

export type PortfolioMediaActions = ReturnType<typeof createPortfolioMediaActions>;
