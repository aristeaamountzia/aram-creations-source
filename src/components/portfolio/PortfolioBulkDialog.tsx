import { BulkEditModal } from '../BulkEditModal';

import type { PortfolioCatalog } from './usePortfolioCatalog';
import type { PortfolioActions } from './createPortfolioActions';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioSelection } from './usePortfolioSelection';

type Props = Pick<PortfolioCatalog, 'design'> &
  Pick<PortfolioActions, 'handleApplyBulkEdit'> &
  Pick<PortfolioWorkspace, 'isBulkEditOpen' | 'setIsBulkEditOpen'> &
  Pick<PortfolioSelection, 'selectedItems'>;

export function PortfolioBulkDialog(props: Props) {
  const { design, handleApplyBulkEdit, isBulkEditOpen, selectedItems, setIsBulkEditOpen } = props;
  if (!isBulkEditOpen) return null;
  return (
    <BulkEditModal
      open={isBulkEditOpen}
      selectedCount={selectedItems.length}
      mode="portfolio"
      categories={design.categories.map(c => ({ id: c.id, label: c.title }))}
      statuses={design.statuses.map(s => s.label)}
      onClose={() => setIsBulkEditOpen(false)}
      onApply={handleApplyBulkEdit}
    />
  );
}
