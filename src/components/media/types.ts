export type ManagedMediaKind = 'image' | 'video';

export interface ManagedMedia {
  url: string;
  type: ManagedMediaKind;
  title?: string;
  isNew?: boolean;
  fileObj?: File;
  fileName?: string;
  showInShop?: boolean;
  edited?: boolean;
  originalUrl?: string;
  originalType?: ManagedMediaKind;
  originalFileName?: string;
  restoreBackup?: {
    url?: string;
    type?: ManagedMediaKind;
    fileName?: string;
    isNew?: boolean;
    fileObj?: File;
  };
}

export interface PreparedMediaResult {
  items: ManagedMedia[];
  errors: string[];
}
