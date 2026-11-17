import { useState, useRef } from 'react';
import { db } from '../../firebase';
import { loadHistory, restoreHistory } from '../../lib/catalog-history';

import type { PortfolioManagerProps } from './portfolio-model';
import type { PortfolioCatalog } from './usePortfolioCatalog';

type Dependencies = Pick<PortfolioManagerProps, 'history'> &
  Pick<PortfolioCatalog, 'setError'>;

export function usePortfolioHistory(dependencies: Dependencies) {
  const { history, setError } = dependencies;

  const [showHistory, setShowHistory] = useState(false);
  const historyBusy = useRef(false);
  const [restoringHistory, setRestoringHistory] = useState(false);

  const changes = history.filter(entry => entry.collection === 'portfolio' && entry.cloudId);

  const undo: any[] = [], redo: any[] = [];

  for (const entry of [...changes].reverse()) {
    if (entry.type === 'PORTFOLIO_UNDO') {
      if (undo.at(-1)?.cloudId === entry.sourceId) redo.push(undo.pop());
    } else if (entry.type === 'PORTFOLIO_REDO') {
      if (redo.at(-1)?.cloudId === entry.sourceId) undo.push(redo.pop());
    } else {
      undo.push(entry);
      redo.length = 0;
    }
  }

  async function replay(forward: boolean) {
    const summary = (forward ? redo : undo).at(-1);
    if (!summary || historyBusy.current) return;
    historyBusy.current = true;
    setRestoringHistory(true);
    setError('');
    try {
      const entry = await loadHistory(db, summary);
      const inverse = { ...entry, before: entry.after ?? null, after: entry.before ?? null };
      const action = forward ? entry : inverse;
      await restoreHistory(db, forward ? inverse : entry, {
        ...action, type: forward ? 'PORTFOLIO_REDO' : 'PORTFOLIO_UNDO', sourceId: summary.cloudId,
        message: (forward ? 'Επανάληψη: ' : 'Αναίρεση: ') + entry.message, timestamp: new Date().toISOString()
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Απέτυχε η επαναφορά.'); }
    finally { historyBusy.current = false; setRestoringHistory(false); }
  }

  return { showHistory, setShowHistory, restoringHistory, changes, undo, redo, replay };
}

export type PortfolioHistory = ReturnType<typeof usePortfolioHistory>;
