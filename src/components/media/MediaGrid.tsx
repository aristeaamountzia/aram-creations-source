import type { ManagedMedia } from './types';
import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: ManagedMedia[];
  variant: 'shop' | 'private';
  downloadName: string;
  dragProps: (index: number) => Record<string, unknown>;
  canEdit?: (media: ManagedMedia) => boolean;
  canRestore?: (media: ManagedMedia) => boolean;
  onEdit?: (index: number) => void;
  onRestore?: (index: number) => void;
  onRemove: (index: number) => void;
  onMakePrimary?: (index: number) => void;
}

export function MediaGrid(props: MediaGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {props.items.map((media, index) => (
        <MediaCard
          key={`${media.url}-${index}`}
          media={media}
          index={index}
          variant={props.variant}
          downloadName={props.downloadName}
          dragProps={props.dragProps(index)}
          canEdit={props.canEdit?.(media)}
          canRestore={props.canRestore?.(media)}
          onEdit={props.onEdit ? () => props.onEdit?.(index) : undefined}
          onRestore={props.onRestore ? () => props.onRestore?.(index) : undefined}
          onRemove={() => props.onRemove(index)}
          onMakePrimary={props.onMakePrimary && index > 0 ? () => props.onMakePrimary?.(index) : undefined}
        />
      ))}
    </div>
  );
}
