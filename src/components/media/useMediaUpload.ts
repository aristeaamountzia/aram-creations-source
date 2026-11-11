import { useCallback } from 'react';
import { validateMediaFile } from '../../lib/media-validation';
import type { ManagedMedia, PreparedMediaResult } from './types';

interface UseMediaUploadOptions {
  prepareImage: (file: File) => Promise<File>;
  prepareVideo: (file: File) => Promise<File>;
}

export function useMediaUpload({ prepareImage, prepareVideo }: UseMediaUploadOptions) {
  const prepareFiles = useCallback(async (files: readonly File[], showInShop: boolean): Promise<PreparedMediaResult> => {
    const items: ManagedMedia[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        const detected = await validateMediaFile(file);
        const prepared = detected.kind === 'image' ? await prepareImage(file) : await prepareVideo(file);
        items.push({
          url: URL.createObjectURL(prepared),
          type: detected.kind,
          isNew: true,
          fileObj: prepared,
          fileName: file.name,
          showInShop
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Αποτυχία προετοιμασίας αρχείου.';
        errors.push(`${file.name}: ${message}`);
        if (error instanceof Error && error.name === 'AbortError') break;
      }
    }
    return { items, errors };
  }, [prepareImage, prepareVideo]);

  return { prepareFiles };
}
