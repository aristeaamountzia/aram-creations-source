import React, { useEffect } from 'react';
import type { PortfolioManagerProps } from './portfolio/portfolio-model';
export type { PortfolioManagerProps } from './portfolio/portfolio-model';
import { usePortfolioCatalog } from './portfolio/usePortfolioCatalog';
import { usePortfolioSelection } from './portfolio/usePortfolioSelection';
import { usePortfolioHistory } from './portfolio/usePortfolioHistory';
import { usePortfolioWorkspace } from './portfolio/usePortfolioWorkspace';
import { usePortfolioAi } from './portfolio/usePortfolioAi';
import { createPortfolioMediaActions } from './portfolio/createPortfolioMediaActions';
import { createPortfolioActions } from './portfolio/createPortfolioActions';
import { PortfolioToolbar } from './portfolio/PortfolioToolbar';
import { PortfolioCatalogPanel } from './portfolio/PortfolioCatalogPanel';
import { PortfolioEditorDialog } from './portfolio/PortfolioEditorDialog';
import { PortfolioImageEditor } from './portfolio/PortfolioImageEditor';
import { PortfolioDetailDialog } from './portfolio/PortfolioDetailDialog';
import { PortfolioBulkDialog } from './portfolio/PortfolioBulkDialog';

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  history = [],
  onBack,
  onNavigateOrders,
  onOpenSettings,
  currentUser,
  onSignOut
}) => {
  const catalog = usePortfolioCatalog();
  const selection = usePortfolioSelection({ ...catalog });
  const historyController = usePortfolioHistory({ ...catalog, history });
  const workspace = usePortfolioWorkspace({ ...catalog });
  const ai = usePortfolioAi({ ...workspace, ...catalog });
  const mediaActions = createPortfolioMediaActions({ ...workspace, ...catalog });
  const actions = createPortfolioActions({ ...catalog, ...workspace, ...ai, ...selection });
  const {
    closeEditor, form, imageEditorTarget, inspectItem, isBulkEditOpen, saving, setImageEditorTarget,
    setInspectItem, setIsBulkEditOpen, uploading
  } = workspace;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (imageEditorTarget) { if (!uploading) setImageEditorTarget(null); return; }
        if (inspectItem) { setInspectItem(null); return; }
        if (isBulkEditOpen) { setIsBulkEditOpen(false); return; }
        if (form && !saving && !uploading) { void closeEditor(); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectItem, isBulkEditOpen, imageEditorTarget, form, saving, uploading]);

  return (
    <main className="backoffice-view min-h-screen p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20 relative">
      <PortfolioToolbar
        {...actions}
        {...historyController}
        {...ai}
        {...workspace}
        {...catalog}
        currentUser={currentUser}
        onBack={onBack}
        onNavigateOrders={onNavigateOrders}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />
      <PortfolioCatalogPanel
        {...historyController}
        {...catalog}
        {...workspace}
        {...actions}
        {...selection}
      />
      <PortfolioEditorDialog
        {...mediaActions}
        {...ai}
        {...workspace}
        {...catalog}
        {...actions}
      />
      <PortfolioImageEditor
        {...workspace}
        {...mediaActions}
      />
      <PortfolioDetailDialog
        {...actions}
        {...catalog}
        {...workspace}
      />
      <PortfolioBulkDialog
        {...catalog}
        {...actions}
        {...workspace}
        {...selection}
      />
    </main>
  );
};
