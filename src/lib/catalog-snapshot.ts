interface CatalogSnapshotState {
  empty: boolean;
  metadata?: { fromCache?: boolean };
}

/** An empty cache is not evidence that the remote catalog is empty. */
export function isUnconfirmedEmptyCatalog(snapshot: CatalogSnapshotState): boolean {
  return snapshot.empty && snapshot.metadata?.fromCache === true;
}
