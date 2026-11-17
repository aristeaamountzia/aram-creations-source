import { portfolioMedia } from '../../lib/video-links';
import { ItemDetailModal } from '../ItemDetailModal';

import type { PortfolioActions } from './createPortfolioActions';
import type { PortfolioCatalog } from './usePortfolioCatalog';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';

type Props = Pick<PortfolioActions, 'cloneItem' | 'edit' | 'remove'> &
  Pick<PortfolioCatalog, 'design'> &
  Pick<PortfolioWorkspace, 'inspectItem' | 'setImageEditorTarget' | 'setInspectItem' | 'setOrderMessage'>;

export function PortfolioDetailDialog(props: Props) {
  const {
    cloneItem, design, edit, inspectItem, remove, setImageEditorTarget, setInspectItem, setOrderMessage
  } = props;
  if (!inspectItem) return null;
  return (
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
        const list = portfolioMedia(inspectItem);
        const index = list.findIndex(media => media.url === imgUrl);
        if (index >= 0) {
          setImageEditorTarget({ url: imgUrl, mediaIndex: index, originalUrl: list[index].originalUrl, itemId: inspectItem.id, title: inspectItem.title || inspectItem.name });
          setInspectItem(null);
        }
      }}
    />
  );
}
