import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { loadHistory, persistHistory, restoreHistory } from '../../lib/catalog-history';
import { notifyOperationSuccess } from '../../lib/sound-notifications';

export interface CatalogHistoryEntry {
    type?: string; id?: string; name?: string; message?: string; timestamp?: string;
    collection?: string; cloudId?: string; localId?: string; parts?: number; hasBefore?: boolean;
    before?: any; after?: any;
}
export interface CatalogAction {
    type: string; id?: string; name?: string; message?: string;
    data?: Record<string, any>; oldData?: Record<string, any>; newData?: Record<string, any>;
    items?: Array<{ id?: string; data?: Record<string, any>; oldData?: Record<string, any>; newData?: Record<string, any> }>;
}

export const buildHistoryEntryFromAction = (action: CatalogAction, typeOverride?: string): CatalogHistoryEntry => {
    const actionType = typeOverride || action.type || 'ACTION';
    const base = {
        type: actionType,
        id: action.id || '',
        name: action.name || action.message || 'Ενέργεια backoffice',
        message: action.message || 'Ενέργεια backoffice'
    };

    if (action.type === 'DELETE') {
        return {
            ...base,
            name: action.data?.name || base.name,
            before: action.data || null,
            after: null
        };
    }

    if (action.type === 'UPDATE') {
        return {
            ...base,
            before: action.oldData || action.data || null,
            after: { ...(action.oldData || {}), ...(action.newData || action.data || {}) }
        };
    }

    if (action.type === 'BULK_UPDATE') {
        return {
            ...base,
            before: (action.items || []).map(item => ({ id: item.id, ...(item.oldData || {}) })),
            after: (action.items || []).map(item => ({ id: item.id, ...(item.oldData || {}), ...(item.newData || {}) }))
        };
    }

    if (action.type === 'BULK_DELETE') {
        return {
            ...base,
            before: (action.items || []).map(item => ({ ...(item.data || item), id: item.id || item.data?.id })),
            after: null
        };
    }

    return base;
};

export const canRestoreHistoryEntry = (entry: CatalogHistoryEntry | null | undefined) => {
    if (entry?.cloudId) return entry.hasBefore || ['ADD', 'BULK_DUPLICATE'].includes(entry.type);
    if (!entry) return false;
    if ((entry.type === 'ADD' || entry.type === 'BULK_DUPLICATE') && (entry.after?.id || (Array.isArray(entry.after) && entry.after.length))) return true;
    if (entry.id && entry.before) return true;
    if (Array.isArray(entry.before) && entry.before.length) return true;
    return false;
};

/** Local undo stacks and cloud history share the existing restoration engine. */
export function useCatalogHistory(firebaseReady: boolean, currentUser: User | null) {
    const [undoStack, setUndoStack] = useState<CatalogAction[]>([]);
    const [redoStack, setRedoStack] = useState<CatalogAction[]>([]);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [showRedoToast, setShowRedoToast] = useState(false);
    const [versionHistory, setVersionHistory] = useState<CatalogHistoryEntry[]>(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('aram_version_history') || '[]');
            return Array.isArray(stored) ? stored : [];
        } catch (err) {
            return [];
        }
    });
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historySaveError, setHistorySaveError] = useState('');
    const lastAction = undoStack[undoStack.length - 1] || null;
    const redoAction = redoStack[redoStack.length - 1] || null;

    useEffect(() => {
        if (!firebaseReady || !currentUser) return;
        return onSnapshot(query(collection(db, 'catalogHistory'), orderBy('timestamp', 'desc'), limit(100)), snapshot => {
            setVersionHistory(previous => {
                const cloud = snapshot.docs.map(row => row.data());
                const signatures = new Set(cloud.map(row => `${row.timestamp}|${row.type}|${row.id}`));
                return [...cloud, ...previous.filter(row => !row.cloudId && !signatures.has(`${row.timestamp}|${row.type}|${row.id}`))].sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,200);
            });
        }, () => setHistorySaveError('Δεν φορτώθηκε το ιστορικό από το cloud.'));
    }, [firebaseReady, currentUser]);

    useEffect(() => {
        if (!showUndoToast) return;
        const timer = setTimeout(() => setShowUndoToast(false), 6500);
        return () => clearTimeout(timer);
    }, [showUndoToast, lastAction?.message]);

    useEffect(() => {
        if (!showRedoToast) return;
        const timer = setTimeout(() => setShowRedoToast(false), 6500);
        return () => clearTimeout(timer);
    }, [showRedoToast, redoAction?.message]);

    const pushVersionHistory = (entry: CatalogHistoryEntry) => {
        const historyEntry = {
            ...entry,
            localId: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        };
        void persistHistory(db, historyEntry).catch(() => setHistorySaveError('Η αλλαγή έγινε, αλλά το ιστορικό δεν αποθηκεύτηκε στο cloud. Κράτησε ένα backup.'));
        setVersionHistory(prev => {
            const next = [historyEntry, ...prev].slice(0, 200);
            try {
                localStorage.setItem('aram_version_history', JSON.stringify(next));
            } catch (err) {}
            return next;
        });
    };

    const pushUndoAction = (action: CatalogAction, shouldLogHistory = true) => {
        setUndoStack(prev => [...prev, action].slice(-20));
        setRedoStack([]);
        setShowUndoToast(true);
        setShowRedoToast(false);
        if (shouldLogHistory && action.type !== 'DELETE') pushVersionHistory(buildHistoryEntryFromAction(action));
    };

    const handleUndo = async () => {
        if (!lastAction) return;
        try {
            const original = buildHistoryEntryFromAction(lastAction);
            await restoreHistory(db, original);
            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, lastAction].slice(-20));
            setShowUndoToast(false);
            setShowRedoToast(true);
            pushVersionHistory({
                ...buildHistoryEntryFromAction(lastAction, 'UNDO'), before: original.after || null, after: original.before || null,
                message: 'Αναίρεση: ' + (lastAction.message || 'ενέργεια backoffice')
            });
            notifyOperationSuccess('Αναίρεση', 'Η ενέργεια αναιρέθηκε επιτυχώς.');
        } catch (err) {
            alert("Σφάλμα αναίρεσης: " + err.message);
        }
    };

    const handleRedo = async () => {
        if (!redoAction) return;
        try {
            const original = buildHistoryEntryFromAction(redoAction);
            await restoreHistory(db, { ...original, before: original.after, after: original.before });
            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, redoAction].slice(-20));
            setShowRedoToast(false);
            setShowUndoToast(true);
            pushVersionHistory({
                ...buildHistoryEntryFromAction(redoAction, 'REDO'),
                message: 'Επαναφορά: ' + (redoAction.message || 'ενέργεια backoffice')
            });
            notifyOperationSuccess('Επαναφορά', 'Η ενέργεια επανήλθε επιτυχώς.');
        } catch (err) {
            alert("Σφάλμα επαναφοράς: " + err.message);
        }
    };

    const handleRestoreVersion = async (entry: CatalogHistoryEntry) => {
        if (!entry?.before || !entry.id) return;
        if (!window.confirm('Να επαναφερθεί αυτή η προηγούμενη έκδοση;')) return;
        try {
            const loaded = await loadHistory(db, entry);
            await restoreHistory(db, loaded);
            pushVersionHistory({ type: 'HISTORY_RESTORE', collection: loaded.collection || 'jewelry', id: loaded.id, message: 'Επαναφορά προηγούμενης έκδοσης', before: loaded.after, after: loaded.before });
            setIsHistoryOpen(false);
        } catch (err) {
            alert("Αποτυχία επαναφοράς έκδοσης: " + err.message);
        }
    };

    const handleRestoreHistoryEntry = async (entry: CatalogHistoryEntry) => {
        if (!canRestoreHistoryEntry(entry)) {
            alert('Δεν υπάρχουν αρκετά δεδομένα σε αυτή την εγγραφή ιστορικού για επαναφορά.');
            return;
        }
        if (!window.confirm('Να γίνει επαναφορά αυτής της ενέργειας;')) return;
        try {
            entry = await loadHistory(db, entry);
            await restoreHistory(db, entry);
            pushVersionHistory({
                type: 'HISTORY_RESTORE',
                collection: entry.collection || 'jewelry',
                id: entry.id || '',
                name: entry.name || 'Επαναφορά ιστορικού',
                message: 'Έγινε επαναφορά από το ιστορικό: ' + (entry.message || entry.type || 'ενέργεια'),
                before: entry.after || null,
                after: entry.type === 'BULK_DUPLICATE' ? null : entry.before || null
            });
            setIsHistoryOpen(false);
        } catch (err) {
            alert("Αποτυχία επαναφοράς ιστορικού: " + err.message);
        }
    };

    return { versionHistory, setVersionHistory, historySaveError, isHistoryOpen, setIsHistoryOpen, lastAction, redoAction, showUndoToast, setShowUndoToast, showRedoToast, setShowRedoToast, pushVersionHistory, pushUndoAction, handleUndo, handleRedo, handleRestoreVersion, handleRestoreHistoryEntry, canRestoreHistoryEntry };
}
export type CatalogHistoryController = ReturnType<typeof useCatalogHistory>;
