import type { ReactNode } from 'react';
import { MediaGrid } from './MediaGrid';
import { MediaUploader } from './MediaUploader';
import type { ManagedMedia } from './types';
import { useMediaOrdering } from './useMediaOrdering';

interface MediaManagerProps {
  items: ManagedMedia[];
  variant: 'shop' | 'private' | 'portfolio';
  uploadLabel: ReactNode;
  uploadHelp?: ReactNode;
  inputClassName?: string;
  disabled?: boolean;
  downloadName: string;
  children?: ReactNode;
  orderingHelp?: ReactNode;
  onFiles: (files: File[]) => void | Promise<void>;
  onChange: (items: ManagedMedia[]) => void;
  onReorder?: (items: ManagedMedia[], fromIndex: number, toIndex: number) => void;
  canEdit?: (media: ManagedMedia) => boolean;
  canRestore?: (media: ManagedMedia) => boolean;
  onEdit?: (index: number) => void;
  onRestore?: (index: number) => void;
  onRemove: (index: number) => void;
  onCaptionChange?: (index: number, caption: string) => void;
}

export function MediaManager({ items, onChange, onReorder, ...props }: MediaManagerProps) {
  const ordering = useMediaOrdering(items, onChange, onReorder);
  return (
    <div className="mb-4">
      <MediaUploader
        label={props.uploadLabel}
        help={props.uploadHelp}
        disabled={props.disabled}
        inputClassName={props.inputClassName}
        onFiles={props.onFiles}
      />
      {props.children}
      {items.length > 0 && (
        <div className="mt-4">
          {props.orderingHelp && <div className="text-xs text-stone-500 mb-2 italic">{props.orderingHelp}</div>}
          <MediaGrid
            items={items}
            variant={props.variant}
            downloadName={props.downloadName}
            dragProps={ordering.dragProps}
            canEdit={props.canEdit}
            canRestore={props.canRestore}
            onEdit={props.onEdit}
            onRestore={props.onRestore}
            onRemove={props.onRemove}
            onMakePrimary={props.variant !== 'private' ? ordering.moveToStart : undefined}
            onMoveUp={props.variant === 'portfolio' ? ordering.moveUp : undefined}
            onMoveDown={props.variant === 'portfolio' ? ordering.moveDown : undefined}
            onCaptionChange={props.onCaptionChange}
          />
        </div>
      )}
    </div>
  );
}
