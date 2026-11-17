import { WixProjectExport } from '../WixProjectExport';
import { CatalogExcelExport } from '../CatalogExcelExport';
import { FirebaseMediaCleanup } from '../FirebaseMediaCleanup';
import { emptyForm } from './portfolio-model';
import { IconDownload, IconPlus, IconSettings } from './icons';
import type { PortfolioManagerProps } from './portfolio-model';
import type { PortfolioActions } from './createPortfolioActions';
import type { PortfolioHistory } from './usePortfolioHistory';
import type { PortfolioAi } from './usePortfolioAi';
import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioCatalog } from './usePortfolioCatalog';

type Props = Pick<PortfolioManagerProps, 'currentUser' | 'onBack' | 'onNavigateOrders' | 'onOpenSettings' | 'onSignOut'> &
  Pick<PortfolioActions, 'exportCsv'> &
  Pick<PortfolioHistory, 'redo' | 'replay' | 'restoringHistory' | 'setShowHistory' | 'showHistory' | 'undo'> &
  Pick<PortfolioAi, 'setAiSuggestion'> &
  Pick<PortfolioWorkspace, 'setEditorTab' | 'setForm' | 'setVideoProgress'> &
  Pick<PortfolioCatalog, 'setError'>;

export function PortfolioToolbar(props: Props) {
  const {
    currentUser, exportCsv, onBack, onNavigateOrders, onOpenSettings, onSignOut, redo, replay,
    restoringHistory, setAiSuggestion, setEditorTab, setError, setForm, setShowHistory, setVideoProgress,
    showHistory, undo
  } = props;
  return (
    <><header className="backoffice-toolbar flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
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
          <button type="button" disabled={!undo.length || restoringHistory} onClick={() => void replay(false)} className="px-3 py-2 text-xs font-bold disabled:opacity-40">Αναίρεση</button>
          <button type="button" disabled={!redo.length || restoringHistory} onClick={() => void replay(true)} className="px-3 py-2 text-xs font-bold disabled:opacity-40">Επανάληψη</button>
          <button type="button" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)} className="px-3 py-2 text-xs font-bold">Ιστορικό</button>
          <FirebaseMediaCleanup />
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
    </header></>
  );
}
